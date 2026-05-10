# AlloFlow Feature Inventory

**Generated:** 2026-05-09
**Codebase scale:** ~656,000 lines of non-redundant source code, 1 maintainer (Aaron Pomeranz, PsyD)
**Monolith size:** 26,754 lines (`AlloFlowANTI.txt`) after Round 8 extractions
**Total user-facing features:** ~177
- 52 monolith-level features across 16 categories
- 92 STEM Lab tools across 9 subject areas
- 33 SEL Hub items (31 tools + 2 infrastructure files) mapped to CASEL competencies
**Distribution model:** Runs as a Gemini Canvas artifact; districts pay $0 by riding existing Google Education Gemini quotas

---

## Prior audit references

This document is the project's first comprehensive feature inventory in a single file. Previously-existing audit artifacts focus on accessibility rather than feature coverage:

| Document | Date | Scope |
|---|---|---|
| [REFLECTIVE_JOURNAL.md](REFLECTIVE_JOURNAL.md) | Feb 8 – Apr 2, 2026 | Reflective narrative of 16 entries from 5 AI agents; Entry 5 (Feb 22) references "the feature audit" but is reflexive, not structured |
| [tool_conformance_ledger.md](tool_conformance_ledger.md) | Apr 26, 2026 | WCAG 2.1 AA per-tool compliance ledger (~80 STEM tools + sidebar) |
| [AXE_AUDIT.md](AXE_AUDIT.md) | Apr 27, 2026 | axe-core 4.10.3 testing across 7 scenarios |
| [VPAT-2.5-WCAG-AlloFlow.md](VPAT-2.5-WCAG-AlloFlow.md) | Apr 28, 2026 | Full VPAT 2.5 conformance documentation |
| [alloflow_wcag_aa_audit_report.md](alloflow_wcag_aa_audit_report.md) | Apr 2, 2026 | Comprehensive WCAG AA report |

This inventory complements those by adding **discoverability paths** (where in the UI to find each feature) which the accessibility ledgers do not include.

---

## Table of contents

1. [How to navigate this document](#1-how-to-navigate)
2. [Architectural primer](#2-architectural-primer)
3. [Monolith features (16 categories)](#3-monolith-features)
4. [STEM Lab tools (92 tools, 9 subject areas)](#4-stem-lab-tools)
5. [SEL Hub tools (33 items)](#5-sel-hub-tools)
6. [Discoverability cheat sheet](#6-discoverability-cheat-sheet)
7. [Status & known gaps](#7-status--known-gaps)
8. [Architectural patterns by family](#8-architectural-patterns)
9. [Cross-references](#9-cross-references)

---

## 1. How to navigate

**Discoverability legend** — the click-paths below use these conventions:

| Notation | Meaning |
|---|---|
| Sidebar → X | Left-hand sidebar tool list (in teacher mode); click X to expand its config panel |
| Header → Y | Top header bar (gear icon, language picker, role switcher, etc.) |
| STEM Lab modal → Tile | The full-screen STEM Lab grid that opens when `showStemLab` is true |
| SEL Hub modal → Tile | Same shape for SEL Hub when `showSelHub` is true |
| `activeView === 'X'` | The right-pane content renderer keyed off the `activeView` state |
| Auto-trigger | Surfaces contextually based on user state (e.g., wizard on first launch) |

**Verifying a feature in code:**
```bash
# STEM Lab tool exists at:
ls stem_lab/stem_tool_<name>.js

# SEL Hub tool exists at:
ls sel_hub/sel_tool_<name>.js

# Find a monolith feature's render branch:
grep -n "activeView === 'X'" AlloFlowANTI.txt

# Find a sidebar tool config:
grep -n "expandedTools.includes('X')" AlloFlowANTI.txt
```

---

## 2. Architectural primer

AlloFlow is a **hub-and-spoke React app** that runs as a single Gemini Canvas artifact. The host monolith (`AlloFlowANTI.txt`, compiled to `App.jsx`) is the artifact itself; CDN modules load via `<script>` tags from `cdn.jsdelivr.net/gh/Apomera/AlloFlow@<git-hash>/`.

**Key state gates** (declared in `AlloFlowANTI.txt`):
- `activeView` — string keying which content view renders in the right pane (`'simplified'`, `'glossary'`, `'quiz'`, `'dbq'`, `'adventure'`, etc., 26 values)
- `expandedTools` — array of sidebar tool IDs currently expanded
- `showStemLab` / `showSelHub` — gate the two modal tool grids
- `isTeacherMode` / `isParentMode` / `isIndependentMode` / `isStudentLinkMode` — role gates that change the UI surface
- `showWizard`, `hasSelectedRole` — onboarding flow state

**Tool registries:**
- `window.StemLab.registerTool(id, config)` — STEM tools self-register on load
- `window.SelHub.registerTool(id, config)` — SEL tools same pattern
- `window.AlloModules.X` — top-level CDN module exports (e.g., `PdfAuditView`, `BridgeSendModal`, `GroupSessionModal`)

**Module loading** happens eagerly in AlloFlowContent's first useEffect via `loadModule(name, url)` — script tags inserted into `<head>` with jsdelivr CDN URLs pinned to a specific git hash (rewritten by `build.js --mode=prod`). Fallback to `raw.githubusercontent.com` if jsdelivr 404s.

**Top-level CDN modules:** 98 (post-Round-8). Of these, 9 were created in May 2026 extraction sessions (this session). The rest are older.

---

## 3. Monolith features

Features defined in or directly orchestrated by `AlloFlowANTI.txt`. Many delegate the actual rendering to CDN view modules.

### 3.1 Content Input & Generation

| Feature | Purpose | Discoverability | Users | Module/View |
|---|---|---|---|---|
| **Source Text Input** | Accept teacher-pasted text, file upload, or URL as the lesson's source material | Sidebar → Source Input panel (always visible, first tool) → paste/upload OR toggle "Generate" | Teacher, Independent | Monolith, `activeView='input'` |
| **Generate Source Text (AI)** | Use Gemini to author original source material at specified reading level, tone, and length with optional citations | Source Input panel → toggle "Generate Source Text" → fill topic + form → Generate | Teacher | Inline; uses Gemini |
| **Generic Content Output View** | Routing fallback: renders the current generated content when no dedicated view exists (e.g., word-sounds output before user enters a specific subview) | Auto-routed when a generated item has no specific `activeView` mapping | All | Monolith, `activeView='output'` |

### 3.2 Text Analysis & Adaptation

| Feature | Purpose | Discoverability | Users | Module |
|---|---|---|---|---|
| **Analysis** | Decompose source: readability metrics, grammar issues, accuracy/fact-checking, discrepancy flags | Sidebar → Analysis (auto-runs on input change) | Teacher, Student (read-only) | `view_analysis_module.js`, `activeView='analysis'` |
| **Glossary** | Tier 1/2/3 vocabulary extraction with definitions, optional visual variants, AI enhancement | Sidebar → Glossary → set tier counts → Generate | Teacher (create), Student (reference) | `view_glossary_module.js`, `activeView='glossary'` |
| **Simplified Text** | Generate leveled versions (K-12 grade bands) of source text preserving meaning | Sidebar → Simplified → choose grade levels → Generate | Teacher (create), Student (read at level) | `view_simplified_module.js`, `activeView='simplified'` |

### 3.3 Phonics & Reading Fundamentals

| Feature | Purpose | Discoverability | Users | Module |
|---|---|---|---|---|
| **Word Sounds Studio** | AI-driven phonics: sound-spelling patterns, word families, sight words, blending drills, IPA-to-MP3 audio playback | Sidebar → Word Sounds (🔊) → focus phonemes/families → Generate | Teacher (design), Student (drills) | `word_sounds_module.js`, `view_word_sounds_preview_module.js` |

Underlying data: `WORD_SOUNDS_STRINGS`, `WORD_FAMILY_PRESETS`, `SOUND_MATCH_POOL`, `RIME_FAMILIES`, `IPA_TO_AUDIO`. Activities include Spelling Bee, Sound Sort, Letter Tracing (per REFLECTIVE_JOURNAL Entry 5 — independently surfaced by a prior agent).

### 3.4 Comprehension & Engagement

| Feature | Purpose | Discoverability | Users | Module |
|---|---|---|---|---|
| **FAQ Generator** | Extract 5-15 anticipated student questions from source with AI answers at appropriate level | Sidebar → FAQ → set question count → Generate | Teacher, Student | `view_faq_module.js`, `activeView='faq'` |
| **Brainstorm** | Prompt students for prior knowledge / ideas with AI follow-up + voting on strongest contributions | Sidebar → Brainstorm (💡) → students enter ideas → AI evaluates | Student (primary) | `view_brainstorm_module.js`, `activeView='brainstorm'` |
| **UDL Guide / Socratic Dialogue** | Context-aware Socratic prompts + UDL scaffolding suggestions on demand | Sidebar → "UDL Advice" or `?` key | Teacher | `view_misc_modals_module.js`, `activeView='udl-advice'` |

### 3.5 Visual & Organizational Scaffolds

| Feature | Purpose | Discoverability | Users | Module |
|---|---|---|---|---|
| **Outline / Graphic Organizer** | Hierarchical outline OR visual organizer (concept map, fishbone, T-chart, Venn) | Sidebar → Outline → choose type → Generate | Teacher, Student | `view_outline_module.js`, `activeView='outline'` |
| **Image Generation** | Gemini Imagen-generated illustrations / diagrams / photos mapped to lesson sections | Sidebar → Image → set count + style → Generate | Teacher, Student | `view_image_module.js`, `activeView='image'` |
| **Sentence Frames** | Sentence starters / paragraph frames at specified Bloom's level | Sidebar → Sentence Frames (💬) → Generate | Teacher, Student | `view_sentence_frames_module.js`, `activeView='sentence-frames'` |

### 3.6 Narrative & Role-Play

| Feature | Purpose | Discoverability | Users | Module |
|---|---|---|---|---|
| **Adventure Mode** | AI-generated branching narrative, NPC dialogue, inventory system (Adventure Shop), XP/levels, multi-turn state | Sidebar → Adventure (🗺️) → set premise → Generate → Play Adventure | Teacher (design), Student (play), Parent (read-aloud) | `view_adventure_module.js`, `activeView='adventure'`; uses `ADVENTURE_GUARDRAIL`, `ADVENTURE_SHOP_ITEMS`, `NARRATIVE_GUARDRAILS` |
| **Persona Chat** | Student converses with AI-powered historical figure / literary character / domain expert / Socratic guide | Sidebar → Persona (👤) → select/generate persona → Start Chat | Student (primary), Teacher (setup) | `view_persona_chat_module.js`, `activeView='persona'` |

### 3.7 Assessment & Feedback

| Feature | Purpose | Discoverability | Users | Module |
|---|---|---|---|---|
| **Quiz / Exit Ticket** | MCQ + short-answer + matching at configurable difficulty/Bloom's level; modes: Exit Ticket, Pre-Check, Formative, Spaced Review | Sidebar → Quiz → choose mode → Generate | Teacher (design), Student (answer) | `view_quiz_module.js`, `activeView='quiz'` |
| **Math Fluency Probe** | Timed arithmetic drills with WCPM-analog metrics, error pattern flagging, history graphs | Sidebar → Math → Fluency Probe tab → set parameters → Start | Teacher (assign), Student (practice) | `view_math_module.js`, `activeView='math'` / `'math-fluency-maze'`; `FLUENCY_BENCHMARKS` |
| **Running Record / Fluency Assessment** | Live oral reading capture with sub/omit/insert/SC marking, accuracy %, RTI documentation | Header → Teacher Tools → Fluency Assessment OR sidebar during lesson | Teacher, Reading Specialist | `fluency_module.js`; `calculateRunningRecordMetrics()`, `analyzeFluencyWithGemini()`, `getBenchmarkComparison()` |

### 3.8 Higher-Order Thinking & Analysis

| Feature | Purpose | Discoverability | Users | Module |
|---|---|---|---|---|
| **Timeline / Sequencing** | Interactive timeline (linear, parallel, cyclical, nested) with cause-effect linking | Sidebar → Timeline → set mode → Generate | Teacher, Student | `view_timeline_module.js`, `activeView='timeline'`; `TIMELINE_MODE_DEFINITIONS` |
| **Concept Sort** | Draggable concept cards into categories with AI feedback | Sidebar → Concept Sort → define categories → student sorts → AI scores | Teacher (setup), Student | `view_concept_sort_module.js`, `activeView='concept-sort'` |
| **DBQ (Document-Based Questions)** | Primary-source documents + scaffolded analysis questions (attribution, bias, audience, purpose) + evidence-building | Sidebar → DBQ (📜) → set count + source type → Generate | Teacher, Student | `view_dbq_module.js`, `activeView='dbq'` |
| **Math Problem Solver** | AI step-by-step solver with error pattern recognition + graphing | Sidebar → Math → Problem Solver tab → upload/type → Solve | Student (primary), Teacher | `view_math_module.js` |

### 3.9 Lesson Synthesis

| Feature | Purpose | Discoverability | Users | Module |
|---|---|---|---|---|
| **Lesson Plan / Full-Pack Export** | Assemble all generated outputs into printable PDF/DOCX/HTML with pacing, standards, teacher notes, answer keys, family-guide variant | Sidebar → Lesson Plan → choose components + format + audience → Generate | Teacher, Student, Parent | `view_lesson_plan_module.js`, `activeView='lesson-plan'` |
| **Alignment Report** | Auto-map content to selected standards; flag gaps and redundancy | Sidebar → Alignment Report (✓) → auto-audit | Teacher, Administrator | `view_alignment_report_module.js`, `activeView='alignment-report'` |

### 3.10 Live Collaborative Learning

| Feature | Purpose | Discoverability | Users | Module |
|---|---|---|---|---|
| **Live Session** | Teacher launches session with code; students join with code+nickname; teacher controls pacing, sees live aggregated responses, can broadcast individual answers | Header → Live Session → Start (teacher); Join Session screen → enter code (student) | Teacher (orchestrator), Student (cohort) | `view_misc_panels_module.js` (group session), session orchestration in monolith |
| **Group Session Modal** | Teacher manages student groups within a live session: drag-drop resources between groups, create/delete groups, per-group profile (language, ttsSpeed, etc.) | Live session → Group Manager button | Teacher | `view_misc_panels_module.js` (Round 7); gates on `showGroupModal && activeSessionCode && sessionData` |
| **Student Dashboard** | Personal progress: quiz history, fluency trend, adventure progress, word-sounds streak, concept mastery | Student Mode → Dashboard (or default landing) | Student | `student_analytics_module.js`, `activeView='dashboard'` |
| **Teacher Dashboard / Educator Hub** | Class cohort analytics: per-student trends, concept-accuracy heatmap, recommended reteach topics, misconception clusters | Header → Dashboard / Educator Hub | Teacher, Coach, Admin | `student_analytics_module.js` + `view_misc_panels_module.js` |

### 3.11 Header & Navigation Controls

| Feature | Purpose | Discoverability | Users |
|---|---|---|---|
| **Quick-Start Wizard** | Guided first-time setup: topic → grade/standards → UDL prefs → pacing | First launch (auto) OR Header → ? → Restart Tour | Teacher (new users) |
| **Role Selection** | Pick Teacher / Student / Parent / Independent / Educator Hub mode | App launch → Role Selection dialog | All |
| **Language Picker** | UI language switcher; downstream Gemini outputs adapt | Header → globe icon → 40+ languages | All |
| **Theme & Display Settings** | Dark/light, font size, font family (incl. dyslexia-friendly), color overlays, reduced motion | Header → Settings → Display tab | All |
| **Audio Bank / Voice Config** | Upload pronunciation files; configure TTS voice (pitch/speed) | Header → Settings → Audio tab | Teacher (design), Student |
| **Font Picker / Typography** | Sans-serif / serif / OpenDyslexic / Atkinson Hyperlegible + spacing/height sliders | Header → Settings → Typography tab | All |
| **AI Backend Modal** | Switch AI provider (Gemini / OpenAI / Ollama / LocalAI / Anthropic) | Header (teacher mode) → AI Backend gear icon | Admin, Teacher (advanced) |
| **UI Language Selector (header)** | Same as Language Picker but always-visible widget in header | Header right side | All |

### 3.12 Help, Guidance & Onboarding

| Feature | Purpose | Discoverability | Users | Module |
|---|---|---|---|---|
| **Spotlight Tour** | 24-step interactive walkthrough of all tools with spotlight overlay + "Try It" prompts | Auto on first login OR Header → ? → Start Tour | All | `view_spotlight_tour_module.js`; gates on `runTour && tourRect` |
| **Help Mode** | Toggle-able mode where every button shows hover tooltip with purpose + keyboard shortcut | Header → Help Mode button OR `?` key | All | Inline; uses `data-help-key` attributes + CSS `.help-mode-active` |
| **AlloBot (in-app chatbot)** | Floating Gemini-backed support agent: answers feature questions, suggests tools, escalates to human support | Bottom-right floating avatar OR auto-appears when idle | All | `allobot_module.js` |
| **Help Search** | Searchable knowledge base (markdown pages) | Header → ? → Search Help OR Ctrl+K | All | `view_misc_modals_module.js` |

### 3.13 Special Features

| Feature | Purpose | Discoverability | Users | Module |
|---|---|---|---|---|
| **Escape Room** | 5-10 content-related puzzles in immersive game scenario; team or individual; timed variant | Sidebar → Escape Room OR Header → Games menu | Teacher, Student | `escape_room_module.js`; uses `escapeRoomState`, `escapeTimeLeft` |
| **Word Bank** | Persistent floating sidebar with current glossary terms + audio pronunciation | Always available once Glossary generated | Student | `view_sidebar_panels_module.js`; `wordBankPosition` (drag-positioning) |
| **History Panel** | Chronological log of session outputs with timestamps, version control, export, AI session-summary generation | Header → History | Teacher, Student, Parent | `firestore_sync_module.js` |
| **Project Settings** | Named projects with metadata (grade, standards, theme), save/load JSON, assign to cohort | Header → Save/Load/Settings | Teacher, Student | `view_project_settings_module.js`; `studentProjectSettings`, `persistedLessonDNA` |
| **PDF Accessibility Audit** | Upload PDF → audit for missing alt-text, contrast issues, semantic structure → automated remediation report → export remediated version | Header → Tools → PDF Audit OR Sidebar (teacher) | Teacher, Accessibility Specialist | `view_pdf_audit_module.js` (Round 4 extraction, ~7K source lines, 148 props) |
| **PDF Diff Viewer** | Side-by-side comparison of original vs. fix-and-verify remediated PDF | PDF Audit → Run Fix-and-Verify → Diff Modal | Teacher | `view_misc_panels_module.js` (Round 7); ReactDOM.createPortal pattern |
| **Export Preview & Customization** | Multi-format preview (PDF/DOCX/HTML/Slides/SCORM/Canvas/Blackboard) with branding customization, custom CSS, themes, presets, a11y inspect mode | Lesson Plan output → Download/Export button | Teacher | `view_export_preview_module.js` (Round 5, 50 props) |
| **Gemini Bridge / Send Modal (Teacher)** | Teacher-side bridge: send messages to paired student session with translation, voice options, image attach, chat history, F2F language settings | Teacher mode + active live session → Bridge Send icon | Teacher | `view_gemini_bridge_module.js` (Round 6, 47 props) |
| **Gemini Bridge / Receive Modal (Student)** | Student-side bridge: receive translated message + glossary terms + audio replay + karaoke / projection mode | Student session receives bridge message | Student | `view_gemini_bridge_module.js` (Round 6, 29 props) |
| **Study Timer** | Pomodoro-style focus mode with break reminders + streak tracking | Header → timer icon | Student (primary) | Inline; `studyTimeLeft`, `studyDuration`, `isStudyTimerRunning` |
| **Tour Overlay** | Highlighted spotlight overlay during guided tour | Auto when tour active | All | `view_misc_panels_module.js` (Round 7); gates on `runTour && tourRect` |
| **Accessibility Lab** | Teacher-facing accessibility verification suite: preview lessons as students with disabilities would experience them, run live audits, hear screen reader announcements, simulate common disabilities. Distinct from `a11yauditor` STEM tool (student-built sites) and `view_pdf_audit_module.js` (PDF remediation). | Educator Hub modal → Accessibility Lab card (rose/amber gradient) | Teacher, Accessibility Specialist | `accessibility_lab_module.js`; gates on `isAccessibilityLabOpen` |
| **Community Catalog** | Browse + Submit lesson catalog hosted on GitHub. Browse fetches manifest from raw.githubusercontent.com; filterable cards; download lesson JSON or load into current AlloFlow session. Also Submit tab for sharing back. | Educator Hub or Header → Community Catalog | Teacher, Community contributor | `catalog_module.js` |
| **PoetTree** | Poetry-writing workshop for middle-school + adolescent writers: form scaffolds, syllable counting, rhyme-scheme detection, Gemini-powered feedback on imagery, meter, revision opportunities. Designed specifically for King Middle School pilot. | Trigger via `setShowPoetTree(true)` from sidebar / launcher | Teacher (assign), Student (write) | `poet_tree_module.js`; gates on `showPoetTree` |
| **LitLab (Story Stage)** | Fiction performance + literary analysis: character voices, karaoke performance mode, grade-responsive literary analysis scaffolds. | Trigger via `setShowLitLab(true)` from launcher | Teacher (design), Student (perform) | `story_stage_module.js` (registers as LitLab); gates on `showLitLab` |
| **Immersive Reader** | Microsoft-style read-aloud overlay with text highlighting, picture dictionary, font/spacing controls, syllable + parts-of-speech support. Fullscreen overlay over the current generated content. | Sidebar / Header "Read Aloud" button when content is loaded | Student (primary), all | `immersive_reader_module.js`; `SpeedReaderOverlay` + `ImmersiveToolbar`; gates on `isImmersiveReaderActive` |
| **Launch Pad Splash** | Pre-role-selection splash screen: AlloFlow logo, mic permission banner, 4 mode-selection cards (Full / Guided / Learning Tools / Educator Tools), AI Backend Settings | Auto on app launch (before role chosen) | All | `view_launch_pad_module.js`; gates on `isAppReady && !hasSelectedMode` |
| **Source Generation Panel** | Detailed source-generation form (mode-toggleable from Source Input) | Source Input → Generate mode | Teacher | `view_misc_panels_module.js` (Round 7); gates on `showSourceGen` |
| **Fluency Mode Panel** | In-flow oral fluency capture UI (during live assessment) | Sidebar → Fluency Mode (during a generated content session) | Teacher | `view_misc_panels_module.js` (Round 7) |
| **Volume Builder (math output mode)** | Inline 3D cube/L-block visualization with drag-rotate, surface area, layer slicer (math-mode lesson output, distinct from `stem_tool_volume.js` standalone) | Math output type → "Volume Builder" | Teacher (design), Student (lesson) | `view_misc_panels_module.js` (Round 7); IIFE pattern |
| **Group Session Modal** | (See Live Collaborative Learning above) | | | |
| **UDL Guide Modal** | Same as Sidebar UDL Advice but as full modal for in-depth chats | UDL Guide chat trigger | Teacher | `view_misc_modals_module.js` (Round 5 Tier B) |

### 3.14 Content Engines (infrastructure, not user-facing)

| Component | Purpose | Module |
|---|---|---|
| **Doc Pipeline** | Multi-stage text processing: safety check → readability → vocab extraction → concept mapping → question gen → asset requests; PDF accessibility automation; chunk-based remediation; Tier 2 surgical fixes; export theme generation | `doc_pipeline_module.js` (~14K compiled lines, ~50 functions exported) |
| **Audio / Phoneme Pipeline** | IPA → MP3 mapping, phoneme blending, rhyme matching, grapheme-phoneme correspondence | `word_sounds_module.js`; `audio_banks_module.js` (this session — lazy Proxies for LETTER_NAME / INSTRUCTION / ISOLATION / PHONEME) |
| **Safety / Content Moderation** | Screens AI output for harmful content, profanity, misinformation, age-inappropriate content, bias, PII | `safety_checker_module.js`; integration in `ADVENTURE_GUARDRAIL`, `NARRATIVE_GUARDRAILS`, `RELEVANCE_GATE_PROMPT` |
| **Firestore Sync** | History persistence, sanitization (strip PII before cloud), hydration on load | `firestore_sync_module.js` |
| **Module Scope Extras** | Language utilities (getSpeechLangCode, languageToTTSCode, isRtlLang, getContentDirection), ErrorBoundary class, session asset upload/hydrate | `module_scope_extras_module.js` (this session, Round 4 Tier B) |
| **UI Language Selector (CDN component)** | Header language picker component | `ui_language_selector_module.js` (this session, Round 3 Tier A) |

### 3.15 Student-Facing Modes & Simplified Experiences

| Mode | Purpose | Discoverability | State |
|---|---|---|---|
| **Student Mode** | Simplified UI hiding teacher controls; focus on core learning tools in logical order | Role Selection → Student | `isTeacherMode=false` |
| **Student Link Mode** | Joined a teacher's live session via code | Join Session screen → enter code + nickname | `isStudentLinkMode=true` |
| **Independent Mode** | Self-directed learning; curated lesson library; goal-setting + streaks; daily nudges | Role Selection → Independent Learner | `isIndependentMode=true` |
| **Parent / Family Mode** | Caregiver-friendly UI: simplified adventure, family glossary, celebration-focused progress, suggested prompts | Role Selection → Parent | `isParentMode=true` |
| **Zen Mode** | Distraction-free reading mode (hides header) | Header → Zen toggle | `isZenMode=true` |

### 3.17 Games Bundle (17 interactive game components)

Loaded via `games_module.js` (auto-generated from `games_source.jsx`). Each game is a React component used inside Quiz, Adventure, or sidebar tool flows. Not standalone tools — surfaced contextually.

| Component | Purpose |
|---|---|
| `MemoryGame` | Match-pairs flip card game |
| `MatchingGame` | Drag-to-match pairs (terms ↔ definitions, etc.) |
| `TimelineGame` | Drag events into chronological order |
| `ConceptSortGame` | Drag concepts into categories (also rendered standalone via Concept Sort tool) |
| `VennGame` | Drag items into Venn diagram intersections |
| `CauseEffectSortGame` | Pair causes with effects |
| `PipelineBuilderGame` | Sequence steps in a process pipeline |
| `CrosswordGame` | Crossword puzzle from glossary terms |
| `SyntaxScramble` | Sentence-fragment unscramble |
| `BingoGame` | Teacher-facing bingo with content cells |
| `StudentBingoGame` | Student-facing bingo (during live session) |
| `WordScrambleGame` | Letter unscramble from word bank |
| `TChartSortGame` | Drag items into T-chart columns |
| `ConceptMapSortGame` | Drag items into concept-map nodes |
| `OutlineSortGame` | Drag items into outline structure |
| `FishboneSortGame` | Drag items into fishbone diagram causes |
| `ProblemSolutionSortGame` | Pair problems with solutions |

Discoverability: surfaced contextually within Quiz mode (game variants), Adventure puzzles, sidebar Concept Sort tool, and live-session game broadcasts.

### 3.16 Major Cross-Cutting Subsystems

| Subsystem | Lines | Notes |
|---|---|---|
| **PDF Accessibility Audit Modal (extracted)** | ~7,189 source lines (Round 4) | Largest single feature; full audit pipeline + remediation + diff + chunk map + fidelity verification + ADA Title II legal context + Knowbility partner panels |
| **Doc Builder Insert Blocks** | Inline IIFE in monolith; per project memory off-limits to extract | 21-block picker; KaTeX/Prism lazy-CDN-loaded |
| **AlloBot Sage** | Roguelite where spells unlock from mastery in other STEM tools | `allobot_module.js`; cross-tool meta-game layer |
| **AlloHaven** | Persistent home/sanctuary with decoration economy | `allohaven_module.js` |
| **Symbol Studio** | AI PCS-style symbol generator (alternative to Boardmaker); Imagen + image-to-image pipeline | `symbol_studio_module.js` |
| **StoryForge** | Student story-creation tool with teacher gallery (FERPA-gated by `!_isCanvasEnv`) | `story_forge_module.js` |
| **Behavior Lens** | 80+ observation/analysis tools for educators (separate Educator Hub gate) | `behavior_lens_module.js` |
| **Report Writer** | AI-assisted clinical report generation with accuracy checks | `report_writer_module.js` |

---

## 4. STEM Lab tools

92 self-contained interactive tools, accessed via the **STEM Lab modal** (`showStemLab=true`). Each registers via `window.StemLab.registerTool(id, config)` and shows up as a tile in the modal grid grouped by subject.

### 4.1 Mathematics (21 tools)
*(Includes `geometryProver`, registered as a second tool inside `stem_tool_geo.js`. Also note: `fractionViz` is an alias for `fractions` — both registered in `stem_tool_fractions.js` pointing to the same plugin object.)*

| ID | Display name | Purpose | Grade band |
|---|---|---|---|
| `algebraCAS` | Algebra CAS | Computer Algebra System with solver, equation builder, balance scale, AI tutor | 6-12, AP |
| `inequality` | Inequality Grapher | Number-line visualizer for inequalities with notation, quizzing, value testing | 6-12 |
| `calculus` | Calculus Lab | Riemann sums, derivatives, guided discovery missions | 9-12, AP |
| `fractions` | Fractions Lab | 6 tabs: Practice, Compare, Operations, Equivalents, Converter, Fraction Wall | 3-8 |
| `multtable` | Multiplication Table | Interactive times tables with visual + audio feedback | K-5 |
| `numberline` | Number Line | Explore, Challenges, Skip Count tabs | K-5 |
| `unitconvert` | Unit Converter | Visual comparison, quiz, AI word-problem generation | 6-12 |
| `protractor` *(file: `stem_tool_angles.js`)* | Angles Explorer | Interactive protractor with classification, real-world examples, polygon angles, clock calculator, badges | 3-8 |
| `areamodel` | Area Model | Visual multiplication with area model grids, distributive property, partial products, 12 badges | 3-5 |
| `coordinate` *(file: `stem_tool_coordgrid.js`)* | Coordinate Grid | Plot points, draw lines, calculate slope/distance/midpoint, 10 badges | 6-9 |
| `geometryworld` | Geometry World | 3D block-based math explorer with AI voxel geometry lessons + WebXR VR support | 6-12 |
| `volume` | Volume Explorer | 3D volume explorer for composite shapes (standalone, distinct from monolith Volume Builder) | 6-9 |
| `geosandbox` | GeoSandbox | 3D geometry sandbox with formulas + STL export | 9-12 |
| `funcgrapher` | Function Grapher | Function visualization + transformations | 9-12 |
| `graphcalc` | Graph Calculator | Graphing calculator with function composition + analysis | 9-12, AP |
| `dataplot` | Data Plotter | Scatter/bar/line/pie/histogram/box plot/ogive, confidence intervals, z-score | 9-12, AP |
| `statslab` | Statistics Lab | AP Psych/Bio descriptive + inferential tests; jStat-backed; AI-graded interpretation | 9-12, AP |
| `logiclab` | Logic Lab | Propositional logic, proof construction, reasoning exercises | 9-12 |
| `probability` | Probability Lab | Coin flips, dice, spinners, sports statistics simulations | 6-12 |
| `base10` *(file: `stem_tool_manipulatives.js`)* | Math Manipulatives | Base-10 blocks, abacus, slide rule, place value quizzes | K-5 |
| `geometryProver` | Geometry Prover | Theorem exploration, proof construction, discover geometric relationships (registered as 2nd tool inside `stem_tool_geo.js`) | 6-12 |

### 4.2 Biology & Life Sciences (19 tools)

| ID | Display name | Purpose | Grade band |
|---|---|---|---|
| `anatomy` | Anatomy Explorer | 10 body systems, 129 anatomical structures, quiz mode | 6-12, AP |
| `brainatlas` | Brain Atlas | Interactive brain region exploration with neural pathways | 6-12 |
| `dissection` | Dissection Lab | Virtual dissection with layered specimens + guided lessons | 6-12 |
| `dna` | DNA / Genetics Lab | 11 sub-tools: Build, Replicate, Transcribe, Translate, Mutate, CRISPR, Protein, Forensics, Challenge, Battle, Learn | 9-12, AP |
| `punnett` | Punnett Square Lab | 8 sub-tools: Punnett Cross, Pedigree Builder, Population Genetics, Trait Explorer, DNA→Protein, Challenge, Gene Defense Battle, Learn | 9-12 |
| `cell` | Cell Biology Simulator | 11 living micro-organisms in simulated petri dish; discovery + quiz modes | 6-12 |
| `aquarium` | Aquarium Ecosystem Simulator | Progression + economy system with fish management | 3-8 |
| `beehive` | Beehive Colony Simulator | Colony dynamics, nectar economics, waggle dances, seasonal cycles | 6-12 |
| `companionplanting` | Companion Planting Lab | Three Sisters garden simulator (Sims-style management + soil science) | 6-12 |
| `birdlab` | BirdLab — I-Spy Ornithology | Layered SVG habitats with animated bird movement signatures; pairs with Cornell Merlin | 3-12 |
| `migration` | Migration Lab | V-formation aerodynamics, wind currents, migration routes | 6-12 |
| `fireecology` | Fire Ecology | Fire ecology + Indigenous land stewardship with cultural burning simulator | 6-12 |
| `evolab` | Evolution Lab | Natural selection: Selection Sandbox, Beak Lab, Phylogenetic Tree Builder | 9-12, AP |
| `watercycle` | Water Cycle | Precipitation, evaporation, condensation dynamics | 3-8 |
| `pets` | Pets Science Lab | Physiology, ethology, nutrition, genetics, domestication evolution; cross-links to BehaviorLab + EvolutionLab | 3-12 |
| `behaviorlab` | Behavior Lab | Operant + classical conditioning simulator with animated Skinner box | 9-12, AP |
| `firstresponse` | First Response Lab | Medical emergencies: CPR, AED, Stop the Bleed, choking, stroke, seizure, anaphylaxis; cited orgs (AHA/Red Cross/Stop the Bleed/Epilepsy Fdn/ASAN/NAMI) | 6-12 |
| `ecosystem` | Ecosystem Simulator | Predator-prey Lotka-Volterra canvas simulation with live population dynamics + biome variants (grassland, forest, etc.) | 6-12 |
| `epidemic` | Epidemic Simulator | Disease-spread dynamics with R₀, latent period, mortality; example pathogens (COVID-19) | 9-12, AP |

### 4.3 Chemistry & Materials (8 tools)
*(Includes `rockCycle`, registered as a 2nd tool inside `stem_tool_rocks.js`.)*

| ID | Display name | Purpose | Grade band |
|---|---|---|---|
| `chembalance` | Chemistry Lab | 8 sub-tools: Equation Balancer, Reaction Types, Stoichiometry, Molecular Viewer, Lab Safety, Challenge, Element Battle, Learn | 9-12, AP |
| `titration` | Virtual Titration Lab | S-curve graphing, safety drills, incident simulator | 9-12, AP |
| `molecule` | Molecule Lab | 118-element periodic table, 32 compound recipes, Bohr model, reaction simulator | 6-12 |
| `semiconductor` | Semiconductor Lab | Band gaps, doping, P-N junctions, transistors, logic gates | 9-12 |
| `rocks` | Rocks & Minerals Lab | Rock cycle tools + mineral identification | 3-12 |
| `decomposer` | Decomposer | Material decomposer with canvas molecular visualization | 6-12 |
| `bakingscience` | Baking Science Lab | 4 sub-tools: Leavening Lab, Emulsion Mixer, Recipe Scaler, Oven Timeline | 6-12 |
| `rockCycle` | Rock Cycle | Companion to Rocks & Minerals — focused rock-cycle visualization (registered as 2nd tool inside `stem_tool_rocks.js`; description currently empty in source — under-documented) | 6-9 |

### 4.4 Earth & Space (8 tools)
*(Note: SkySchool — visual layers, lakes/rainbows/animals/farms — is a sub-feature of `stem_tool_flightsim.js`, not a standalone tool.)*

| ID | Display name | Purpose | Grade band |
|---|---|---|---|
| `platetectonics` | Plate Tectonics Explorer | Tectonic plates, earthquakes, volcanoes, continental drift | 6-12 |
| `climateExplorer` | Climate Explorer | Carbon calculator, renewables sim, climate justice, solutions spotlight | 6-12 |
| `galaxy` | Galaxy Explorer | Celestial bodies + galactic structure | 6-12 |
| `solarsystem` | Solar System | Planetary motion, orbital mechanics | 3-12 |
| `universe` | Universe Explorer | Cosmic scale + astronomical phenomena | 6-12 |
| `spacecolony` | Space Colony Simulator | Settlement design + resource management in space | 6-12 |
| `spaceexplorer` | Space Explorer Roguelike | AI roguelike STEM tool: 6 destinations, crew system, tech tree, WCAG AA | 6-12 |
| `moonmission` | Moon Mission Simulator | Apollo mission: Launch, Orbit, Transit, Descent, EVA, Return | 6-12 |

### 4.5 Physics (11 tools)

| ID | Display name | Purpose | Grade band |
|---|---|---|---|
| `circuit` | Circuit Builder | 7 component types, Ohm's Law, electron animation, 10 challenges, Kirchhoff's Laws | 9-12, AP |
| `wave` | Wave Simulator | Frequency adjustment, Doppler effect, wave comparison | 9-12 |
| `physics` | Physics Engine | Core mechanics + motion simulation | 9-12, AP |
| `atcTower` | ATC Tower | Air traffic control sim with spatial reasoning, rate problems, vectors | 9-12 |
| `bikelab` | Bike Lab | 2D physics sandbox: Newton's laws, mechanical advantage, gearing | 6-12 |
| `skatelab` | Skate Lab | Halfpipe + gap jump physics with energy + rotation; 8 famous-trick scenarios + BMX vehicle toggle | 9-12 |
| `echolocation` | Echolocation Lab | Bat echolocation + sound physics with sonar vision + Doppler effect | 6-12 |
| `echotrainer` | Echo Trainer | 3D spatial audio echolocation with HRTF binaural audio + Three.js | 6-12 |
| `optics` | Optics Lab | AP Physics 2 geometric + wave optics; 8 tabs side-by-side sims+calculators, 10 sample problems, 25-term glossary, 30-item AP quiz | 9-12, AP |
| `throwlab` | ThrowLab | Sports physics: full 3D drag + Magnus integrator; Pitcher's Mound MVP with 6 pitch types | 6-12 |
| `playlab` | PlayLab | Sports strategy: football + soccer play-design, drag-to-place, animated sim, Coach Mode, drills | 6-12 |

### 4.6 Engineering & Technology (9 tools)

| ID | Display name | Purpose | Grade band |
|---|---|---|---|
| `archstudio` | Architecture Studio | 3D building simulator with STL + blueprint SVG export | 9-12 |
| `gamestudio` | Game Design Studio | Tile palette + tilemap editor for 2D game creation | 6-12 |
| `coding` | Coding Playground | Visual canvas output + block/text-based coding | 3-12 |
| `autorepair` | Auto Repair Shop | Vehicle diagnostic thinking + maintenance skills | 6-12 |
| `cyberdefense` | Cyber Defense Lab | Phishing detection, password strength, cipher playground | 6-12 |
| `renewables` | Renewables Lab | Physics + engineering of solar, wind, hydro, geothermal, wave, tidal, biomass; Mix Designer; Maine home solar calc | 6-12 |
| `flightsim` | Flight Sim | Aircraft physics + flight dynamics | 6-12 |
| `weldlab` | Weld Lab | 8 modules: Heat Input, Bead Lab, Defect Hunt, Process Compare, Joint Catalog, Symbols Reader, PPE & Safety, Career Pathways; Maine BIW/EMCC/AWS data | 9-12 |
| `roadready` | RoadReady (Driver's Ed) | Raycaster driving sim + permit test + parking 2D + hypermiling lab; Maine focus | 9-12 |

### 4.7 Creativity & Arts (5 tools)

| ID | Display name | Purpose | Grade band |
|---|---|---|---|
| `artstudio` | Art Studio | Color harmony palette creation + pixel art | K-12 |
| `worldbuilder` | World Builder | Collaborative literary RPG with multiplayer world + writing-based mechanics | 6-12 |
| `music` | Music Synthesizer | Piano, scales, chords, harmony pad, beat pad | K-12 |
| `singing` | Singing Lab | Pitch training, vocal range finder, vibrato analysis | 6-12 |
| `oratory` | Oratory | Public speaking + presentation skills | 6-12 |

### 4.8 Computer Science & AI (7 tools)
*(Includes `datastudio` companion to `dataplot`.)*

| ID | Display name | Purpose | Grade band |
|---|---|---|---|
| `llm_literacy` | AI Literacy Lab | Tokenization, next-token prediction, temperature, hallucination, UDL-framed guidance | 6-12 |
| `allobotsage` | AlloBot: Starbound Sage | Roguelite spell-crafter where spells unlock from mastery in other STEM tools (retrieval-practice-as-combat) | 6-12 |
| `typingpractice` | Typing Practice | Disability-first keyboarding: dyslexia font, motor-planning windows, large-key visual keyboard, IEP-workflow | K-12 |
| `a11yauditor` | Digital Accessibility Lab | WCAG 2.1 AA audit for websites, HTML, documents | 6-12 |
| `applab` | App Lab | AI Mini-App Generator: hierarchical pipeline, AI builds apps from description | 6-12 |
| `geo` | Geo Quiz | Geography quiz + knowledge testing | 3-12 |
| `dataStudio` | Data Studio | Data visualization companion to dataPlot; lives at `stem_tool_datastudio.js`. *(Previously had a duplicate registration leftover in `stem_tool_artstudio.js` from before the extraction split — removed May 9, 2026.)* | 6-12 |

### 4.9 Life Skills & Cross-Domain (6 tools)

| ID | Display name | Purpose | Grade band |
|---|---|---|---|
| `learning_lab` | Learning Lab | Bloom's taxonomy, UDL, metacognition, spaced repetition, growth mindset | 6-12 |
| `assessmentliteracy` | Assessment Literacy Lab | Construct/measurement critique, validated vs. pseudoscience instruments; School Psych at 24 | 9-12 |
| `economicslab` | Economics Lab | 5 simulators: Supply & Demand, Personal Finance, Stock Market, Business Sim, National Economy | 9-12 |
| `money` | Money Math | Coins, bills, grocery store sim, currency exchange, tips, budget, compound interest | 3-8 |
| `lifeskills` | Life Skills | Practical life competency development | 6-12 |
| `nutritionlab` | NutritionLab | Macronutrient Lab + Micronutrient Atlas; physiology-first framing for adolescents; NEDA helpline; sources (USDA / NIH ODS / Harvard / AAP / NEDA) | 6-12 |

**Tools using 3D graphics (Three.js):** GeoSandbox, Geometry World, Echo Trainer, Architecture Studio, Anatomy

**Multi-module tools (≥4 sub-modules):** DNA Lab (11), Chemistry Lab (8), Punnett Square (8), Baking Science (7), Optics Lab (8), Economics (5), Conflict Theater (5 scenes / 8 characters / 8 scenarios)

---

## 5. SEL Hub tools

31 tools + 2 infrastructure files. Accessed via the **SEL Hub modal** (`showSelHub=true`). Many cite specific clinical/research frameworks (CASEL, Neff, Dweck, Kuypers, Bridges, AFSP, SAMHSA, QPR, Sources of Strength, Olweus, Gilligan, Noddings, Rawls, Indigenous wisdom traditions).

### 5.1 Self-Awareness (8 tools)

| ID | Display name | Purpose | Grade band | Notes |
|---|---|---|---|---|
| `compassion` | Self-Compassion Workshop | Three pillars (self-kindness, common humanity, mindfulness); R.A.I.N. meditation; loving-kindness | K-12 | Cites Kristin Neff |
| `emotions` | Emotions Explorer | Interactive emotion wheel with 8+ primary emotions, intensity slider 1-5, mood calendar, AI coach | K-12 | |
| `strengths` | Strengths Finder | VIA character strengths + academic + social strengths; strengths interview; peer recognition | K-12 | |
| `zones` | Emotion Zones | Zones of Regulation (Kuypers) — Blue / Green / Yellow / Red identification + regulation strategies | K-12 | |
| `growthmindset` | Growth Mindset Workshop | Neuroplasticity ed, fixed→growth reframing, persistence stories | K-12 | Cites Carol Dweck |
| `journal` | Feelings Journal | Daily mood check-ins, free-write, mood analytics, AI insights, mood playlist | K-12 | |
| `perspective` | Perspective-Taking Lab | Scenario theater for empathy mapping with multiple viewpoints | K-12 | |
| `voicedetective` | Voice Detective | Vocal prosody emotion recognition (ASD-supportive) using Gemini TTS | K-12 | |

### 5.2 Self-Management (7 tools)

| ID | Display name | Purpose | Grade band | Notes |
|---|---|---|---|---|
| `coping` | Coping Toolkit | 6 strategy types × 15+ strategies; Calm Plan builder; AI strategy matcher | K-12 | |
| `mindfulness` | Mindfulness Corner | Breathing animations (box / 4-7-8 / belly), body scan, 5-4-3-2-1 grounding, gratitude | K-12 | Web Audio bowls + chimes |
| `execfunction` | Executive Function Workshop | 6 tabs (Map/Start/Hold/Plan/Time/Coach); ADHD + planning paralysis + working memory | 3-12 | Barkley + Dawson framework |
| `goals` | Goals Setter | SMART goals, habit-streak counter, AI coach, vision board, goal buddy | K-12 | |
| `advocacy` | Advocacy Workshop | Branching scenarios (silent/aggressive/assertive), script builder, rights ed | K-12 | |
| `transitions` | Transitions Workshop | Change Curve (Kubler-Ross/Bridges adapted); 8 change types + coping anchors | K-12 | |
| `selfadvocacy` | Self-Advocacy Studio | IDEA, FAPE, LRE, Section 504; IEP/504 plans; accommodation requests; disclosure decisions; transition planning | 6-12 | Print-friendly CSS |

### 5.3 Social Awareness (4 tools)

| ID | Display name | Purpose | Grade band | Notes |
|---|---|---|---|---|
| `community` | Community & Culture | Cultural awareness, identity mapping, navigating differences | K-12 | Anti-racist, microaggression literacy |
| `cultureexplorer` | Culture Explorer | AI deep dives into world cultures with Imagen + TTS pronunciations | 3-12 | 7 regions × 8 lenses |
| `upstander` | Upstander Workshop | Bullying through 3 lenses (target/perpetrator/bystander); upstander moves | K-12 | Cites Olweus, Hawkins; APA Zero Tolerance critique |
| `ethicalreasoning` | Ethical Reasoning Lab | Dilemmas + frameworks; stakeholder mapping; AI Socratic dialogue | K-12 | Mill, Kant, Aristotle, Gilligan, Noddings, Rawls, bell hooks, Ubuntu |

### 5.4 Relationship Skills (8 tools)

| ID | Display name | Purpose | Grade band | Notes |
|---|---|---|---|---|
| `conflict` | Conflict Resolution Lab | Branching conflict scenarios; I-statement builder; de-escalation; repair | K-12 | |
| `conflicttheater` | Conflict Theater | Immersive multi-NPC mediation with persistent personalities, body language, harmony meter, restorative scoring | 6-12 | **MVP v0.1** — 1 scene (cafeteria), 1 scenario, 2 characters; Phase 2 pending |
| `friendship` | Friendship Workshop | 6 friendship styles self-assessment; conversation starters; repair/forgiveness | K-12 | ASD + ADHD social communication aware |
| `social` | Social Skills Lab | Conversation starters, listening challenges, body language decoder, cooperation scenarios | K-12 | Socially anxious / neurodivergent supportive |
| `sociallab` | Social Lab (Pragmatic Language) | Two-tier: static branching scenarios + AI roleplay; ASD pragmatic focus | 3-12 | 8 skill categories |
| `peersupport` | Peer Support Coach | OARS (Open / Affirmation / Reflection / Summary) skills; safety signal training; 5-step safety response | 6-12 | Teen MHFA + MI + Sources of Strength + QPR |
| `teamwork` | Teamwork Builder | Team role discovery; collaborative challenges; team contracts | K-12 | |
| `restorativecircle` | Restorative Circle Process | Circle types (community/repair/celebration/academic/check-in); talking piece traditions; Indigenous roots education | K-12 | Honors Navajo Peacemaking, Haudenosaunee, Maori hui, Aboriginal Australian practices |

### 5.5 Responsible Decision-Making (3 tools)

| ID | Display name | Purpose | Grade band | Notes |
|---|---|---|---|---|
| `decisions` | Decision Workshop | Structured decision-making, ethical dilemmas, consequence mapping, cognitive bias awareness | K-12 | |
| `safety` | Safety & Boundaries | Body safety, trusted adults, consent, boundaries, safety plan builder | K-8 | High safety profile |
| `crisiscompanion` | Crisis Companion | Peer support + suicide prevention for adolescents; AFSP/SAMHSA/Sources of Strength/QPR aligned; safe-messaging audited | 6-12 | **AWAITING editorial review** — content-warning gated; teal/emerald palette (calming, not alarming); Trevor Project named for LGBTQ+ disproportionate risk |

### 5.6 Civic & Hope (1 tool)

| ID | Display name | Purpose | Grade band |
|---|---|---|---|
| `civicaction` | Civic Action & Hope Lab | 13 tabs: Name It / Understand It / Cope / Explore Issues / Act / Plan / Simulate / Survey / Rights & Dissent / Service / Quiz / Scenarios / Hope | 6-12 |

### 5.7 SEL Hub Infrastructure (2 files, not user-facing)

| File | Purpose |
|---|---|
| `sel_safety_layer.js` | Shared crisis-resource lookup, triangulated tier detection, safe-messaging utilities; integrated by Crisis Companion + Peer Support; provides `printDoc`, `assessSafety`, `renderResourceFooter` |
| `sel_hub_module.js` | Registry shell + modal frame + tile grid layout |

---

## 6. Discoverability cheat sheet

Quick lookup for the most-used features:

| If you want to... | Click path |
|---|---|
| Generate a leveled text adaptation | Sidebar → Simplified → choose grades → Generate |
| Make a quiz from source text | Sidebar → Quiz → mode + count → Generate |
| Check a PDF for accessibility issues | Header → Tools → PDF Audit → upload |
| Run a guided lesson tour | Header → ? → Start Tour |
| Switch to dark mode | Header → Settings → Display → Dark |
| Change UI language | Header → globe icon → choose language |
| Start a live class session | Header → Live Session → Start (gives you a session code) |
| Join a teacher's session as a student | App launch → Student → Join Session → enter code + nickname |
| Open a STEM tool | Sidebar → STEM Lab button → click tile in modal grid |
| Open an SEL tool | Sidebar → SEL Hub button → click tile in modal grid |
| Build a full lesson plan PDF | Sidebar → Lesson Plan → choose components + format → Generate |
| Have a student chat with a historical figure | Sidebar → Persona → select figure → Start Chat |
| Start an interactive adventure | Sidebar → Adventure → set premise → Generate → Play |
| Run a math fluency probe | Sidebar → Math → Fluency Probe tab → start drill |
| Capture a running record | Header → Teacher Tools → Fluency Assessment |
| Switch AI provider (Gemini → Ollama / OpenAI) | Header → AI Backend gear icon |
| Customize export theme + branding | Lesson Plan → Download → Export Preview |
| Send a bridge message to paired student | Live session → Bridge Send icon (teacher mode) |
| Generate phonics drills | Sidebar → Word Sounds → focus phonemes → Generate |
| Get UDL guidance on a current lesson | Sidebar → UDL Advice OR press `?` |
| Restore from a saved lesson | Header → Load → pick JSON file |
| Change UI font (incl. dyslexia-friendly) | Header → Settings → Typography |
| Take an assessment as Independent learner | Role Selection → Independent → pick lesson → answer |
| View student progress (parent) | Role Selection → Parent → Dashboard |
| Open Crisis Companion | SEL Hub modal → Crisis Support tile → content-warning accept |
| Practice OARS peer support | SEL Hub modal → Peer Support tile |
| Set up a SMART goal | SEL Hub modal → Goals Setter tile |
| Map your zone of regulation | SEL Hub modal → Zones tile |
| Open Behavior Lens (Educator Hub) | Role Selection → Educator Hub → BehaviorLens |
| Generate AI symbols (PCS-style) | Symbol Studio (separate launch path; check `window.AlloModules.SymbolStudio`) |
| Visit AlloHaven sanctuary | Floating button OR `showAlloHaven` trigger |
| Play AlloBot Sage roguelite | STEM Lab → AlloBot tile (`allobotsage`) |
| Submit a story (StoryForge) | StoryForge entry; teacher gallery is `!_isCanvasEnv` only (FERPA gate) |

---

## 7. Status & known gaps

### Tools awaiting review
- **Crisis Companion** (`sel_tool_crisiscompanion.js`) — awaiting Aaron's editorial pass before student-facing release. Content-warning gate is functional; the editorial review covers safe-messaging audit + clinical accuracy.

### MVPs / Phase 1
- **Conflict Theater** (`sel_tool_conflicttheater.js`) — MVP v0.1 with 1 scene + 1 scenario + 2 characters. Phase 2 plans: Imagen portraits, expanded scenario library, cross-session memory.
- **NutritionLab** (`stem_tool_nutritionlab.js`) — Phase 1 ships scaffold + Macronutrient Lab + Micronutrient Atlas; future phases for additional modules.
- **Typing Practice** (`stem_tool_typingpractice.js`) — built by scheduled remote agent; disability-first + AI-personalized + IEP-workflow focus.

### Recovered production bugs (this session)
Five latent bugs surfaced by extraction work and fixed:
1. **60+ instruction-audio prompts** — were defined inside misplaced `_LOAD_INSTRUCTION_AUDIO_RAW(key, ...)` calls that ignored their args; recovered to `INSTRUCTION_AUDIO` Proxy via `audio_banks_module.js` (Round 3 Tier B)
2. **`downloadBatchResults`** — referenced by PDF audit batch button but never wired through `_docPipeline`; fixed via doc_pipeline source export + monolith binding (Round 4)
3. **`handleAudio` / `ttsSpeed`** — referenced by Bridge modals but never declared in scope; fixed via explicit-prop wiring (Round 6)
4. **`updatePdfPreview`** — missed prop in PdfAuditView caused 4 onClick handlers to throw; hot-fix added it to props
5. **`exportFluencyCSV` / `generateFluencyScoreSheet`** — defined inside word_sounds + student_analytics CDN module closures, never exposed; lifted into monolith host scope so FluencyModePanel buttons actually work

### Modules with shadowing-bug history (verified this session)
- `view_pdf_audit_module.js` — recovered `t` and `updatePdfPreview` (the largest-prop extraction at 148 props)
- All other extracted modules pass the scope-aware verifier cleanly

### Items mentioned in REFLECTIVE_JOURNAL.md worth re-verifying
- "Spelling Bee", "Sound Sort", "Letter Tracing" activities in `word_sounds_module.js` — Entry 5 mentions a prior agent independently surfaced these as undocumented; worth confirming they're still in the current word_sounds module + included in any external feature lists

### Server-side gaps (not in scope of this audit)
- Firebase functions: `logRemediation`, `dashboardData`, `triggerLmsScan`, `scanResults`, `accessible`, `storeRemediated`, `lmsAuth` — referenced in deploy logs but their implementations weren't surveyed for this inventory

### Known architectural off-limits (per project memory)
- `useTranslation`, `useFocusTrap`, `useAudioRecorder` hooks — Rules-of-Hooks blocks delegation
- `LanguageContext` itself — context identity preservation requires careful sequencing
- Reducers / `INITIAL_STATE` — first-render snapshot bug
- Doc Builder Insert Blocks IIFE — complex inter-closure dependencies
- ModelRegistry / `GEMINI_MODELS.default` — no-fallback issue at L1344 of pre-extraction monolith

---

## 8. Architectural patterns

### Universal patterns across all STEM Lab tools
- **Self-registration** via `window.StemLab.registerTool(id, config)` near top of file
- **WCAG 2.1 AA**: live regions, reduced-motion CSS guard, high-contrast focus, keyboard navigation
- **Web Audio**: procedural sound effects (click, correct, badge unlock) generated, no external audio files
- **Grade-adaptive content**: 3-4 grade band variants per tool with vocabulary + scenario complexity scaled
- **Gemini integration**: 40+ tools have AI tutor / hint / grader / explainer hooks
- **Achievement / badge systems**: tracked in localStorage, with celebration screens

### Universal patterns across all SEL Hub tools
- **Same a11y baseline** as STEM Lab
- **CASEL competency mapping** (most tools)
- **Grade-adaptive scenarios** (4 bands typical)
- **Web Audio**: subtle, low-volume, non-startling, opt-out
- **Cross-session persistence** for journals, mood tracking, goal streaks (localStorage)
- **Safety layer integration** for high-risk tools (Crisis Companion, Peer Support) via `sel_safety_layer.js`

### Multi-module STEM tools (more than 4 sub-modules)
- DNA Lab — 11 sub-tools
- Chemistry Lab — 8 sub-tools
- Punnett Square Lab — 8 sub-tools
- Optics Lab — 8 sub-tools
- Baking Science Lab — 7 sub-tools
- Economics Lab — 5 simulators

### 3D-graphics tools (Three.js)
- GeoSandbox, Geometry World, Echo Trainer, Architecture Studio, Anatomy

### CDN module loading
- Eager load via `loadModule(name, url)` in AlloFlowContent's first useEffect
- URLs pinned to git hash via `build.js --mode=prod` rewrite
- Fallback chain: jsdelivr CDN → raw.githubusercontent.com → fail-soft (host shim renders nothing)
- 98 top-level modules at build time (May 9, 2026)

### Distribution model
- Runs as a single Gemini Canvas artifact
- Districts pay $0; rides on existing Google Education Gemini quotas
- No SaaS install, no LMS integration required
- jsdelivr CDN serves all module files at git-pinned hashes for reproducibility

---

## 9. Cross-references

| Document | Use it for |
|---|---|
| [REFLECTIVE_JOURNAL.md](REFLECTIVE_JOURNAL.md) | Reflexive history of the project (16 entries, 5 AI authors); Entry 5 references "the feature audit" |
| [tool_conformance_ledger.md](tool_conformance_ledger.md) | WCAG 2.1 AA conformance status per STEM Lab tool |
| [AXE_AUDIT.md](AXE_AUDIT.md) | axe-core scenario testing results |
| [VPAT-2.5-WCAG-AlloFlow.md](VPAT-2.5-WCAG-AlloFlow.md) | Full VPAT 2.5 WCAG conformance documentation |
| [alloflow_wcag_aa_audit_report.md](alloflow_wcag_aa_audit_report.md) | Comprehensive WCAG AA audit report |
| [CLAUDE.md](CLAUDE.md) (in `~/.claude/projects/`) | Auto-memory store with project context, user profile, feedback patterns |
| [examples/lesson_briefs.md](examples/lesson_briefs.md) | Sample lesson briefs / use cases |

### Memory references for context
- `project_alloflow_scope.md` — ~650K lines, 80+ tools, hub-and-spoke architecture
- `project_school_box.md` — Docker air-gap deployment status (Tyler Despain collaborating)
- `project_el_conference_king_pitch.md` — King Middle pilot pitch context
- `project_sel_hub_howl_mapping.md` — SEL Hub ↔ EL Education HOWLs mapping
- `feedback_dep_enumerator_must_be_scope_aware.md` — Lessons from May 2026 extraction work

---

**End of inventory.** Total documented features: ~177 user-facing across 156 files (98 monolith CDN modules + 92 STEM Lab tools + 33 SEL Hub items, with overlap).
