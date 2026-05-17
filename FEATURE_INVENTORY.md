# AlloFlow Feature Inventory

> **Companion document:** This file describes *what* the codebase actually
> does (every feature, every tool, every discoverability path). For the
> architectural counterpart describing *how* the codebase is structured
> (container/presentational split, React Contexts, view-module CDN pattern,
> extraction toolchain, test + verify infrastructure), see
> [architecture.md](architecture.md). The two documents pair deliberately:
> feature inventory for product/educator review, architecture for engineering review.

**Generated:** 2026-05-09 (last revised May 15, 2026 — May 14-15 annotation-suite + doc-pipeline-polish + physics-lab + flightsim additions integrated)
**Codebase scale:** ~656,000 lines of non-redundant source code, 1 maintainer (Aaron Pomeranz, PsyD)
**Monolith size:** ~24,000 lines (`AlloFlowANTI.txt`) after May 10 2026 refactor session (down from 26,754 at initial inventory)
**Total user-facing features:** ~570+ documented (was ~177 in initial draft; deepened across 10 review passes — most recent May 14-15 added the annotation suite (§10), in-doc theme switcher in exports, image-size controls across 3 resource types, expanded physics-lab pedagogy, and the resolved Skylab takeoff bug)
- ~95 monolith-level features across 16 categories + 25 deep-dive subsections (§3.17–§3.41)
- **95 STEM Lab tools** across 9 subject areas (on-disk file count May 14 2026; PrintingPress added May 10 for King Middle demo. Multi-module sub-feature counts: DNA Lab 11, Chemistry 8, Punnett 8, Optics 8, Baking 7, PrintingPress 7, Economics 5)
- **34 SEL Hub items** (32 tools + 2 infrastructure files: `sel_hub_module.js` registry shell + `sel_safety_layer.js` shared safety infrastructure) mapped to CASEL competencies + Civic & Hope. **5 tools gained generative-AI Rehearse tabs May 11-14** (Upstander, Restorative Circle, Self-Advocacy, Coping, Friendship) — see §5.8 for the cross-cutting safety pipeline that protects 33 student-free-text AI surfaces across 18 SEL Hub tools + 1 STEM Lab surface (defense-in-depth pre-flight regex gate layered on top of existing assessSafety LLM checks).
- ~290 deep-feature enumerations inside major subsystems (Doc Pipeline 35+ exports, Behavior Lens 15+, Symbol Studio 10+, AlloHaven 4+18, AlloBot Sage 19+5+3, Quiz subsystem 4 modes + AI grader + live aggregator, Adventure 7 components + handlers, Voice + TTS multi-provider, Adaptive Controller gamepad layer, 28 view modules, 20 infrastructure modules, **5 SEL Hub Rehearse tabs with multi-turn role-play + scene generation + break-character coach + end-reflect**, etc.)
**Inventory completeness:** ~99% — remaining gaps are translation-string libraries, individual quest content, and per-tool internal sub-modes that are largely cosmetic. Every major subsystem and every CDN module is now documented with discoverability.
**Bugs fixed during this audit:** 6 net new (Report Writer never loaded, Immersive Reader null overwrites, Teacher Dashboard 10 components unregistered, WordSoundsReviewPanel duplicate registration, view_misc_modals null registrations, GeminiBridgeView deleted-but-consumed) + additional May 11-15 fixes (ExportPreviewView missing `history` prop, doc_pipeline missing `setError`/`pdfBatchSummary`, teacher `LearnerProgressView` missing `isTeacherMode`, word_sounds probe-mode `probeActivity` crash, Space Colony minimap `ctx` typo, Crisis Companion exit-button silent no-op, misleading "monitored for your safety" copy in 5 tools, **launch pad Learning Tools modal showed only after second click** (setTimeout race), **Physics target-destruction mode stale closure** (first-target-disappears + projectile-passes-through-targets, 2-in-1), **Skylab takeoff bleached ground + jolt + missing motion cue**, **Tier 1 bug-fix pass (May 15) on annotation-suite drag**: Rules-of-Hooks violation in NoteBubble/VoiceNoteBubble, drag flooding undo stack with intermediate positions, missing right/bottom drag clamp) — see §7
**Distribution model:** Runs as a Gemini Canvas artifact; districts pay $0 by riding existing Google Education Gemini quotas. **Primary CDN migrated to Cloudflare Pages** (`alloflow-cdn.pages.dev`, May 12 2026); jsdelivr/GitHub is fallback (25 MiB per-file cap; m4a/mp4/onnx gitignored).

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
4. [STEM Lab tools (95 tools, 9 subject areas)](#4-stem-lab-tools)
5. [SEL Hub tools (34 items: 32 tools + 2 infrastructure) + §5.8 cross-cutting safety pipeline](#5-sel-hub-tools)
6. [Discoverability cheat sheet](#6-discoverability-cheat-sheet)
7. [Status & known gaps](#7-status--known-gaps)
8. [Architectural patterns by family](#8-architectural-patterns)
9. [Cross-references](#9-cross-references)
10. [Annotation Suite — cross-cutting feature (May 14-15 2026)](#10-annotation-suite)
11. [Doc Pipeline export-side capabilities (May 14-15 2026 expansion)](#11-doc-pipeline-export-capabilities)
12. [Physics + Flightsim refinements (May 14-15 2026)](#12-physics-flightsim-refinements)

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
| **Persona Chat** | Student converses with AI-powered historical figure / literary character / domain expert / Socratic guide. Includes 16-handler system (`personas_module.js`): persona generation, single + panel chat, AI-generated portraits, retries, reflection prompts, **rapport / XP tracking** (relationship deepens with engagement), **quest completion** (specific learning objectives per persona), **harmony scoring** (live engagement quality meter) | Sidebar → Persona (👤) → select/generate persona → Start Chat | Student (primary), Teacher (setup) | `view_persona_chat_module.js`, `personas_module.js`, `persona_ui_module.js` (HarmonyMeter, CharacterColumn); `activeView='persona'` |

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
| **Curriculum Audit + Remediator** | Parses an audit's structured recommendations across 5 dimensions, maps each to a regeneration action, applies via confirm-before-apply modal. Optional batched Google-Search-grounded fact-check on flagged claims. Distinct from PDF Audit (which is for documents) — this is for the lesson content itself. | Trigger from generated-content panel after audit | Teacher | `audit_remediator_module.js` |
| **Saved STEM Stations** | Teachers save curated collections of STEM Lab tools as "stations" (like learning centers), revisit, and remove. Persisted to localStorage (`alloflow_stem_stations`). | Sidebar → STEM Stations panel (when ≥1 station exists) | Teacher | Inline at AlloFlowANTI.txt:23065+; gates on `activeStation` |
| **Saved SEL Stations** | Same pattern for SEL Hub tools — collected as stations, revisited as needed. | Sidebar → SEL Stations panel | Teacher | Inline at AlloFlowANTI.txt:23114+ |
| **Bookmarklet Audit Queue** | Teachers install a bookmarklet on their browser that captures URLs they want to audit; queued URLs surface in AlloFlow for processing. | Bookmarklet sends URLs → Sidebar → Bookmarklet Audit Queue panel | Teacher | Inline at AlloFlowANTI.txt:20144 + LMS bookmarklet endpoint at L2380 |
| **Error Reporter** | In-app error capture + one-click bug report. Hidden by default; surfaces a small fixed-position red "⚠ N errors" badge in bottom-right after first capture. Solves the "users in Canvas/LMS embed can't access browser DevTools" problem. | Auto-surfaces only after errors occur | All | `error_reporter_module.js` |
| **Voice Input (system-wide)** | Speech-to-text input usable across many features (lesson source, brainstorm, persona chat, Bridge mode). Uses Web Speech API + Gemini fallback. | Microphone icon on text inputs throughout app | All | `voice_module.js` (`window.AlloFlowVoice`) |
| **LTI 1.3 LMS Integration (full)** | Full LTI 1.3 OIDC launch flow — AlloFlow can be installed in Canvas / Schoology / Brightspace / Moodle / D2L as an LTI tool with proper SSO + course/assignment/role context. UI surfaces a context banner on launch showing course + assignment. Backend: `ltiLogin` / `ltiLaunch` / `ltiSession` Firebase functions. | Configure in LMS admin → AlloFlow appears as an LTI tool; user clicks → auto-launched into context | Teacher, Student | Inline UI at AlloFlowANTI.txt:20240; backend at `prismflow-deploy/functions/index.js:183-374` |
| **Class Roster Management** | Persistent cohort with student data: names, group assignments, XP totals, per-student profile (language, ttsSpeed, karaoke mode, communication mode). Persisted to `alloflow_roster_key` in localStorage; synced to Firestore for live sessions. | Teacher mode → Roster panel; auto-syncs in live sessions | Teacher | Inline AlloFlowANTI.txt:4675+; integrates with Group Session Modal |
| **Group Management (within Live Sessions)** | Create/delete student groups, assign students to groups, assign per-group resources (a different lesson item per group). Each group has its own profile: language preference, TTS speed, karaoke mode, visual density, communication mode (verbal / AAC), simplification level, DOK level. | Live Session → Group Session Modal | Teacher | Inline handlers `handleCreateGroup`, `handleAssignStudent`, `handleSetGroupResource`, `handleDeleteGroup`; data structure at AlloFlowANTI.txt:13442 |
| **Educator Hub launcher modal** | Dedicated launcher modal with card grid for educator-specific tools: BehaviorLens, ReportWriter, Symbol Studio, Print Export, AccessibilityLab. Different visual treatment from the SEL/STEM Hub modals to signal "professional clinical tools." | Header → Educator Tools button (teacher mode) | Teacher, Coach, Specialist | Inline at AlloFlowANTI.txt:25929-25970; gates on `showEducatorHub` |
| **Project Save / Load (JSON file)** | Download a complete project (lesson + history + state) as a `.alloflow` JSON file; re-upload to restore. Portable across devices/browsers. Supports auto-save during PDF audit work. | Header → Save / Load buttons | Teacher | `saveProjectToFile()`, `loadProjectFromJson()` at AlloFlowANTI.txt:13201, 14434 |
| **Draft Autosave** | 2-second-debounced autosave of work-in-progress: lesson content, generated outputs, in-flight remediation. Visual indicator ("Saving...") in UI. Survives page refresh; offline-tolerant. | Auto throughout app; status badge in header | All | `isDraftSaving` state + `saveAsync()` at AlloFlowANTI.txt:5380; cloudSync at L13197 |
| **Cloud Sync Status Indicator** | Live sync status visible in header: idle / syncing / error states with appropriate icons. Errors surface a "Retry" affordance. | Header right-side badge | All | `cloudSyncStatus` state at AlloFlowANTI.txt:2659; UI at L22900 |
| **Online / Offline Detection** | Detects `navigator.onLine` changes; switches to local-only mode when offline; queues sync operations for re-online; shows offline banner. | Auto on connection change | All | `isOnline` state at AlloFlowANTI.txt:4634 |
| **Drag-and-Drop System** | Extensive throughout app: reorder resources, drag terms between glossary tiers, drag students between groups, drag concept-sort cards. Touch-compatible. | Click + drag on supported elements | All | Multiple `onDragStart`/`onDragEnd`/`onDrop` handlers; `setDraggedResourceId` central state |
| **Keyboard Shortcuts** | Escape closes modals (universal); `?` toggles Help Mode; tour navigation arrows; context-specific keys (e.g., escape exits chunk reader, fluency probe Esc cancels). | Press the keys | All | Multiple `addEventListener('keydown', ...)` throughout monolith |
| **Reading Theme Swatches** | Swap content rendering theme: default / sepia / high-contrast / dark / cool / warm. Persisted per-user. | Header → Settings → Display → Reading Theme | All | `readingTheme` state + `setReadingTheme()` at AlloFlowANTI.txt:5153; persisted to `allo_reading_theme` |
| **Global Mute Button** | One-click mute of ALL app audio (SFX, TTS, AAC playback, ambient). Persists in localStorage (`alloflow-global-muted`). | Header → 🔇 button (always visible) | All | `GlobalMuteButton` component at AlloFlowANTI.txt:627 |
| **Microphone Permission Management** | Explicit permission flow with status indicator (granted / denied / unknown). Used by voice input, fluency probe, persona chat (voice mode). | Permission banner on Launch Pad; mic icon shows state | All | `micPermissionStatus` state at AlloFlowANTI.txt:2764; `useAudioRecorder` hook |
| **Multi-Provider TTS** | Three TTS backends with separate voice catalogs: **Gemini Voices** (~30 native voices, multilingual), **Kokoro Voices** (open-source, with quality toggle), **Edge TTS Voices** (Microsoft Edge browser TTS). Auto-fallback to Browser-TTS when others fail. Non-English language indicator surfaces when current voice doesn't match content language. | Header → Settings → Voice; auto-switches by content language | All | `voice_config_module.js` (extracted Round 3); UI controls inline in monolith Settings |
| **Web Search Grounding** | Fact-check AI claims against Google Search results before presenting (used in DBQ Web-Enhanced mode, Curriculum Audit, Persona Chat verification). | Auto when AI flag indicates uncertain claim | Teacher (verifies), Student (sees grounded answers) | `WebSearchProvider` (CDN-loaded) at AlloFlowANTI.txt:52, 72 |
| **Flashcard Quiz Mode** | Fifth quiz mode (in addition to Exit Ticket, Pre-Check, Formative, Spaced Review): traditional flashcard front/back with self-rating + optional auto-shuffle. | Sidebar → Quiz → Flashcard mode | Student (primary) | `isFlashcardQuizMode` state + handler at AlloFlowANTI.txt:2147, 4706 |
| **Print Mode** | Most tool outputs include `@media print` CSS for clean printing. Score sheets, fluency records, lesson plans, IEP-ready FBA reports all have dedicated print layouts. `window.print()` invocation in many places. | "🖨️ Print" buttons in output panels | Teacher | Throughout monolith + module HTML templates |
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

### 3.20 Server-side Firebase Functions (12 endpoints)

AlloFlow has a **full backend** in `prismflow-deploy/functions/index.js`, deployed as Firebase Cloud Functions. This is significantly more infrastructure than typical AI ed-tech competitors:

| Endpoint | Purpose |
|---|---|
| **`searchProxy`** | Backend proxy for Web Search Grounding (fact-checking AI claims against Google Search) — keeps API keys server-side |
| **`ltiLogin`** | **LTI 1.3 OIDC login initiation** — first step of the LMS launch flow |
| **`ltiLaunch`** | **LTI 1.3 launch handler** — receives signed launch from Canvas/Schoology/Brightspace/Moodle, creates session, redirects to AlloFlow with context |
| **`ltiSession`** | Session validation + role/context retrieval for LTI users |
| **`logRemediation`** | Logs PDF audit + remediation actions to backend (audit trail for compliance) |
| **`dashboardData`** | Aggregated analytics endpoint for Educator Hub dashboards (cross-student data) |
| **`lmsAuth`** | LMS authentication endpoint (separate from LTI for direct API integrations) |
| **`lmsScan`** | **Scheduled cron** — automatic recurring scan of an LMS for new content to audit |
| **`triggerLmsScan`** | Manual trigger for the LMS scan (teacher-initiated) |
| **`scanResults`** | Returns results of LMS scans (queued documents from Bookmarklet Audit Queue + scheduled scans) |
| **`accessible`** | Public accessibility-audit endpoint (likely powers an embeddable a11y badge / shareable audit link) |
| **`storeRemediated`** | Stores remediated PDF/HTML output back to a persistent location (cloud storage hook) |

**This means AlloFlow has full LTI 1.3 integration ready** — Canvas / Schoology / Brightspace / Moodle / D2L can launch AlloFlow as an LTI tool with proper SSO + context. This is a major feature my earlier matrix marked as "⚠️ partial" — it should be **✅ full LTI 1.3**.

### 3.18 PDF Audit Modal — internal sub-features (22 distinct panels)

The PDF Audit modal (extracted Round 4, 7,189 lines) contains 22 distinct internal panels. Each is conditionally shown during different phases of the audit + remediation lifecycle:

| Sub-feature | Phase | What it does |
|---|---|---|
| **Batch Mode Toggle** | Pre-audit | Switch between Single PDF / Batch / Web-Mode |
| **Quick Downloads (pre-remediation)** | Pre-audit | Original-PDF download access before any work |
| **Knowbility Partner Introduction** | During audit wait | Educational content about Knowbility (a11y nonprofit partner) |
| **Why Accessibility Matters** | During audit wait | Educational content about WCAG impact (shown twice in flow — intro + post-benefits) |
| **Multi-session Page-Range Remediation Panel** | Long jobs | Resume large-document remediation across browser sessions |
| **Pipeline Step Tracker (basic)** | During processing | Real-time progress of audit stages |
| **Pipeline Step Tracker with contextual explanation** | During processing | Step tracker + paragraph explaining what each stage does |
| **Boring Palette Theme Suggestion** | Mid-flow | Detects monochrome originals; suggests color theme to add |
| **Live Chunk Review (inline)** | During processing | Per-chunk review surfaced immediately as chunks complete |
| **ADA Title II Legal Context** | During wait (timed) | Explains Title II compliance requirements for school districts |
| **Image Review + Metadata Panel** | During processing | Review extracted images, set alt-text, decorative flags |
| **Fidelity Verification Panel** | Mid-flow | Compares remediated against original for content drift |
| **Knowbility Partner Panel** | During wait | Detailed Knowbility consultation offering |
| **Resume Remediation Prompt** | Reload-recovery | Detected interrupted audit; offer to resume |
| **Live Chunk Review Panel (full)** | Per-chunk review | Approve/reject/request-fix per chunk with comments |
| **Fix & Verify Results Panel** | Post-remediation | Side-by-side score comparison (before/after) |
| **Chunk Map (with selective re-fix)** | Post-remediation | Per-section accessibility scores; re-run fix on specific sections |
| **Remediation Changelog** | Post-remediation | Audit trail of what was changed, by whom, when |
| **Plain Language Summary Generator** | Post-remediation | Generate teacher-friendly summary of changes for stakeholders |
| **Close-audit Confirm Dialog** | Modal close | Three-way Save / Discard / Cancel prompt protecting unsaved work |
| **Batch Queue Tracker** | Batch mode | Per-PDF progress across queued documents |
| **Auto-fix loop indicator** | Auto-mode | Visual feedback during multi-pass automated fix attempts |

Each panel has its own props, state, and accessibility live region.

### 3.19 Doc Builder Insert Blocks — 22 content templates

The Doc Builder (inside the PDF preview iframe) has a 22-template insert-block picker with 5 categories. Each block is a fully-styled HTML template with editable controls, accessibility attributes, and removal handles:

**Layout (3):** Columns, Divider, Page Break

**Content (7):** Callout (5 styles: info/warning/success/note/danger), Quote, Checklist, Numbered Steps, Accordion (collapsible), Q&A, Definition

**Educational (6):** Sentence Frame (ELL/EL scaffold), Objective (learning objective with measurable verbs), Vocab Card (with TTS pronunciation, image upload, audio upload, examples), Reflection (writing prompt), Rubric (with scale presets), Lesson Plan (full UDL template with 8 sections — Direct Instruction, Guided Practice, Independent Practice, Assessment, Closure, plus UDL Considerations)

**Interactive (1):** Data Table (editable spreadsheet)

**Media (5):** Image (upload OR URL with alt-text), Audio (upload), Video (YouTube/Vimeo embed), Math (KaTeX equation editor with formula library dropdown — quadratic formula, Pythagorean, etc.), Code (syntax highlighting via Prism)

Picker also includes: search/filter, recent-blocks (max 5 per session), category collapse/expand, keyboard navigation.

### 3.21 Doc Pipeline / PDF Audit — exported function inventory (35+ functions)

`doc_pipeline_module.js` is 14,656 lines and exports the largest API surface of any single CDN module. All exports are reachable from the PDF Audit modal and the Doc Builder; some are also reachable from the Expert Workbench command bar.

**Audit & Verification (6)**
- `runPdfAccessibilityAudit` — entry point for full audit pipeline
- `auditOutputAccessibility` — score post-remediation output
- `runAxeAudit` — run axe-core against current PDF preview
- `fixContrastViolations` — WCAG contrast auto-fix pass
- `fixAxeContrastViolationsTargeted` — targeted contrast fix on specific elements
- `sanitizeStyleForWCAG` — strip styles that block WCAG compliance

**Auto-fix loops (3)**
- `autoFixAxeViolations` — multi-pass automated fix attempt
- `refixChunk` — re-run remediation on a single chunk
- `getChunkState` — return per-chunk current state (pending/done/failed)

**3-tier surgical fix system (3)** *(competitor-distinguishing — no other ed-tech tool exposes this granularity)*
- **`runTier2SurgicalFixes`** — surgical, element-level fixes for individual axe violations
- **`runTier2_5SectionScopedFixes`** — section-scoped fixes when single-element fixes fail
- **`runTier3StructuralFix`** — full structural rewrite when section-scoped fixes don't converge

**Expert Workbench (2)** *(autonomous-agent layer — competitor-distinguishing)*
- **`runAutonomousRemediation`** — autonomous agent loop that self-orchestrates audit → fix → re-audit → escalate-tier until convergence
- **`processExpertCommand`** — natural-language command-bar interpreter (e.g., "fix all contrast issues in section 3", "rewrite the table on page 4 as a list")

**PDF Generation & Preview (5)**
- `fixAndVerifyPdf` — atomic fix + verify
- `generateAuditReportHtml` — produce shareable audit report
- `downloadAccessiblePdf` — emit final remediated PDF
- `createTaggedPdf` — produce PDF with proper PDF/UA structure tags
- `getPdfPreviewHtml` — render current state to in-iframe HTML
- `updatePdfPreview` — push HTML changes into preview iframe (the function whose missing prop caused the May 2026 production bug)

**Word Restoration (4)** *(handles OCR drift in original PDFs)*
- `applyWordRestoration` — apply reconstruction across document
- `applyWordRestorationInPlace` — in-place version that doesn't reflow
- `retargetMissingWordsViaGemini` — AI-assisted reconstruction of lost words
- `restoreSentencesDeterministic` — rule-based sentence reconstruction
- `detectAndHandleDuplicates` — dedupe duplicated phrases from OCR errors

**Multi-session support (4)** *(for documents too large for one browser session)*
- `multiSessionId` — current session identifier
- `loadMultiSession` — resume previously-saved session
- `clearMultiSession` — reset session state
- `mergeRangesToFullHtml` — stitch per-session ranges into unified output

**Custom Export Theming (3)**
- `generateCustomExportStyle` — AI-generated export theme from prompt or seed
- `EXPORT_THEMES` — backward-compat theme registry (legacy)
- **`STYLE_SEEDS`** — current theme registry: 8+ pre-built professional themes (`professional`, others) with `cssVars` definitions; user can pick before remediation OR let auto-detection suggest based on original document tone

**HTML Generation (2)**
- `parseMarkdownToHTML` — markdown → accessible HTML
- `generateResourceHTML` — generate resource pages (vocabulary, comprehension, etc.) as HTML

**Discoverability for the workbench features:** PDF Audit modal → Expert tab (or command bar at top of audit modal). Tier escalation is automatic in autonomous mode; manual mode lets the user choose Tier 2 / 2.5 / 3 per chunk via the chunk map.

### 3.22 Word Sounds Studio — internal modes & sub-features

`word_sounds_module.js` is 24,623 lines (second-largest module). Beyond the activity tabs, it has substantial mode-switching logic that materially changes the student experience:

**Assessment modes**
- **Probe Mode** — psychometric probe administration (CBM-style fluency probes); auto-loads from `loadPsychometricProbes`; tracks first-word readiness and timing
- **Sequential Mode** — words drawn from a fixed teacher-set sequence; vs. **Random Mode** (default — words sampled from active grade band)
- **Parent Mode** — simplified parent-facing UI variant for home practice

**Display modes** (controlled via `imageVisibilityMode` state)
- **Smart Image Visibility** — auto-show/hide images based on word complexity + student progress
- **Always-On Images** — always show pictographic support
- **Always-Off Images** — text-only, for orthographic transfer
- **Smart Text Visibility** — independently controls text presentation

**Audio modes**
- **Sound-Only Mode** — text replaced with 🔊 prompt; student must respond by sound only (decoding skill isolation)
- **AAC Mode** — toggles Imagen-generated picture-symbols on response options for AAC users; pre-generates symbols for rhyme/blending/manipulation/syllable/isolation activities
- **Phoneme Audio Bank** — `loadWordAudioBank` integration for human-recorded phoneme audio (vs. TTS); persistence via `loadAudioFromStorage` / `saveAudioToStorage` / `removeAudioFromStorage`

**Activity types referenced** *(internal — not separately registered tools)*
- Rhyme matching, Blending, Phoneme manipulation, Syllable counting, Isolation (initial/medial/final phoneme), Tracing (handwriting capture)
- Achievement badges: First Sound, On Fire!, Unstoppable, Legendary, Perfect 10, Rhyme Master, Sound Detective, Counting Pro

**Linguistic infrastructure**
- `PHONEME_KEYWORDS` — Jolly-Phonics-aligned key-word mapping (e.g., 's' → "snake")
- `HOMOPHONE_CLUSTERS` + `HOMOPHONE_INDEX` — distractor-quality validation
- `SAME_PHONEME_CLUSTERS` + `PHONEME_KEY_OF` — phoneme-equivalence detection
- `RIME_FAMILIES` — onset-rime instructional families
- `GRADE_SUBTEST_BATTERIES` — pre-built K/1/2/3 fluency probe sets
- `estimateFirstPhoneme` / `estimateLastPhoneme` — heuristic phoneme estimation (digraphs, r-controlled, exception handling)

The "Spelling Bee / Sound Sort / Letter Tracing" activities flagged in REFLECTIVE_JOURNAL.md Entry 5 appear to map to (or have been renamed inside) the rhyme/blending/manipulation/tracing activity set. Worth a UI walkthrough to confirm naming surfaces correctly to teachers.

### 3.23 AI Backend Web Search Grounding (SearxNG provider)

`ai_backend_module.js` exposes a **`WebSearchProvider`** that grounds Gemini responses in live web results — used by Quiz fact-checking, persona research, lesson alignment verification, etc.

- Uses a **SearxNG** instance for search (privacy-respecting metasearch; no per-query API key)
- Falls back to Firebase-hosted search proxy at `https://prismflow-911fe.web.app` (the `searchproxy` Firebase function)
- Health check: 2-second timeout against SearxNG; auto-fallback if unavailable
- Topic-extraction pipeline: pattern-match → quoted-string → shortest-meaningful-sentence
- Builds **grounding metadata** that gets attached to the Gemini call so the model cites sources
- Used by: Quiz misconception-distractor validation (Chunk 7), search-grounded teaching prompts, fact-check button on AI outputs

This is a **legitimate competitor-distinguishing feature** — most ed-tech AI tools either don't ground at all (hallucinate freely) or use OpenAI/Perplexity APIs that bill per query. AlloFlow's architecture costs $0 per district.

### 3.27 Quiz Subsystem — Mode Strategies, AI Helpers, Live Aggregators

The Quiz tool is more than a single assessment generator — it has a strategy registry that materially changes generation, render, and aggregation behavior per mode.

**`quiz_mode_strategies.js` — 4 distinct quiz modes** (each with its own promptFrame, target, item-mix, render config, aggregation strategy):

| Mode | Targets | Item-mix default | Render UX | Aggregation |
|---|---|---|---|---|
| **Exit Ticket** 📝 | Today's lesson content | 3 MCQ + 1 fill-blank + 1 short-answer (5 total) | Standard quiz UI; AI explainer on fail; "I don't know" + confidence rating allowed | gradebook |
| **Pre-Check (Readiness Check)** 🎯 | PRIOR knowledge (prerequisite probes — NOT today's lesson) | 2 MCQ + 1 fill-blank + 1 short-answer + 1 relation-mismatch | Pre-lesson dashboard explains gaps to teacher before lesson | pre-lesson-dashboard |
| **Formative Check** | Mid-lesson concept check | (mode-specific mix) | Live heat-map shows class-wide signal in real time | live-heatmap |
| **Spaced Review** | Retention from prior lessons | (spaced-retrieval optimized) | Retention-curve viz | retention-curve |

Each mode includes: `promptFrame`, `questionTargets`, `defaultItemCount`, `allowedItemTypes` (MCQ / fill-blank / short-answer / self-explanation / sequence-sense / relation-mismatch), `defaultItemTypeMix`, render flags (`intro`, `completionMessage`, `aiExplainerOnFail`, `allowIDontKnow`, `allowConfidenceRating`), and an `aggregation` key.

**`quiz_ai_helpers.js` — AI grading**
- `gradeFreeformAnswer(question, response, opts)` — async LLM grader for short-answer responses; returns `{ status: 'correct' | 'partially-correct' | 'incorrect', feedback, expectedAnswer }`
- `gradeFillBlank(question, response, opts)` — async LLM grader for fill-blank with normalized expected-fill comparison
- `clampStatus(s)` — safe enum coercion of model output

**`quiz_live_aggregators.js` — live class aggregation** (used in formative-check + live-quiz modes)
- Per-student per-question grade aggregation with caching
- Teacher-override tracking (`teacherOverridden`, `teacherOverrideTs`, `priorStatus`)
- Display name resolution (animal-name fallback for anonymous students)
- Class-roll aggregator producing per-question summaries: % correct, common wrong answers, IDK rate, time-on-task
- AI-graded responses cached so re-aggregation doesn't re-grade

### 3.28 Adventure Mode — components + handler suites

**`adventure_module.js` — 7 React components**
| Component | Purpose |
|---|---|
| **MissionReportCard** | Post-mission summary card showing accomplishments, choices, learning |
| **ClimaxProgressBar** | Visual progress indicator showing distance to climax/resolution |
| **AdventureAmbience** | Audio-ambience layer for setting (fantasy / sci-fi / historical / etc.) |
| **InventoryGrid** | Visual inventory grid showing collectibles earned |
| **DiceOverlay** | Dice-roll overlay for chance-based outcomes |
| **AdventureShop** | In-adventure collectibles shop UI (uses `ADVENTURE_SHOP_ITEMS`) |
| **CastLobby** | Multi-character casting/role-assignment view at adventure start |

**`adventure_handlers_module.js` (1,161 lines)** — `window.AlloModules.AdventureHandlers` factory exposing handlers for all adventure-page interactions (continue, choose, save, restart, etc.)

**`adventure_session_handlers_module.js` (667 lines)** — `window.AlloModules.AdventureSessionHandlers` for live multi-student adventure sessions where the teacher facilitates one shared narrative

### 3.29 Audit Remediator (separate from Doc Pipeline)

`audit_remediator_module.js` (628 lines) — `AuditRemediator` React component that surfaces actionable artifacts to fix gaps surfaced by a comprehensive audit. Different from `doc_pipeline_module.js`'s PDF-centric audit:

**Detection categories**
- **Vocabulary gaps** — surfaces missing glossary items based on `ENGAGEMENT_KEYWORD_MAP`
- **Engagement gaps** — parses `eng.llmReview.formatGaps` to suggest missing artifact types (e.g., "needs sentence frames", "needs visual scaffold")
- **DOK assessment gaps** — surfaces missing quiz coverage of higher Depth-of-Knowledge tiers
- **Accessibility gaps** — parses `ax.llmReview.fixes` for required artifacts
- **UDL pillar gaps** — iterates UDL framework pillars (Engagement / Representation / Action) and surfaces per-pillar recommendations

**Inline `ActionRow` and `ReadinessBlock` components** — UI rendering of each recommended action with one-click "Generate this" or "Add to lesson plan" buttons.

### 3.30 Accessibility Lab — 5 tabs

`accessibility_lab_module.js` (1,673 lines) — `AccessibilityLab` student-facing tool that teaches WCAG concepts experientially. 5 internal tabs:

| Tab | What it teaches |
|---|---|
| **Preview** | Live preview of accessibility issues (color contrast, missing alt-text, etc.) |
| **Keyboard** | Keyboard-only navigation simulator + scoreable challenges |
| **Audit** | Run audit on user-pasted HTML; explains each violation in plain language |
| **Screen Reader** | Screen-reader simulator (text-only narration of page structure) |
| **Simulators** | Disability-experience simulators (low-vision, color-blindness, motor impairment, cognitive load) |

Plus `ComingSoon` placeholder for upcoming tabs.

### 3.31 Voice & TTS Subsystems

**`voice_module.js` (919 lines, exposes `window.AlloFlowVoice`)** — unified speech-recognition layer
- `getCapabilities()` — detects browser support (`window.SpeechRecognition || webkitSpeechRecognition`, MediaRecorder mimes)
- Persistent voice preferences (`alloflow_voice_pref` localStorage)
- Live transcription with both `onTranscript(simple)` and `onRichResult(rich)` callbacks
- MediaRecorder fallback chain: `audio/webm;codecs=opus` → `audio/webm` → `audio/mp4` → default
- Configurable `maxDurationMs` (60s default), `intentionallyStopped` differentiation, interim vs. final transcript handling
- Designed to replace 7+ inline SpeechRecognition reimplementations across the monolith

**`tts_module.js` (595 lines, exposes `window.AlloModules.TTS = createTTS(deps)`)** — multi-provider TTS
- **Primary**: Gemini TTS via `generativelanguage.googleapis.com/v1beta/models/${tts}:generateContent`; PCM-to-WAV conversion in-browser
- **Fallback 1**: Kokoro TTS (`window._kokoroTTS.speakStreaming`) — offline-capable, voices prefixed `af_/am_/bf_/bm_`; auto-offered when Gemini quota or auth fails
- **Fallback 2**: Browser-native `speechSynthesis` (last resort)
- `AVAILABLE_VOICES` registry; voice-name validation defaults to `Puck` if invalid
- Sequential queue (`state.queue`) prevents overlapping synthesis requests
- Per-call: voice / speed / language / streaming option

### 3.32 Adaptive Controller — gamepad + mouse-cursor accessibility layer

`adaptive_controller_module.js` (395 lines) — turns any gamepad into a full system controller. Critical accessibility feature for students with motor impairments who can't use keyboard/mouse.

- Gamepad polling loop with `_gpadDot` visible cursor overlay (fake mouse)
- Edge-detect button presses (`_gpadBtnEdge`) and analog-stick movement (`_gpadAxis` with deadzone 0.2)
- Translates buttons to keyboard events (`KeyboardEvent` with bubbling), mouse clicks, scroll
- Special handling for `<canvas>` (3D tools) — right stick controls camera/movement when canvas is focused
- `aria-label`-aware target detection: hover via `closest('button,a,[role="button"],input,...')`; reads label aloud
- Vibration feedback via `vibrationActuator`
- Per-button mapping persisted

This module is what makes AlloFlow usable with adaptive controllers (Xbox Adaptive, switch interfaces via USB-HID adapters). Major UDL feature, mostly invisible because it just-works.

### 3.33 Math Fluency Components

`math_fluency_module.js` (3,878 lines) — exposes 2 React components:
- **`MathFluencyPanel`** (`window.AlloModules.MathFluency`) — full math-fact fluency assessment + practice tool
- **`FluencyMazePanel`** (`window.AlloModules.FluencyMaze`) — gamified maze navigation where correct answers unlock paths

Both used inside the Math Fluency view + activity launchers.

### 3.34 Community Catalog (`catalog_module.js`)

`CommunityCatalog` (532 lines) — teacher-to-teacher resource sharing. 2 internal tabs:
- **Browse** — search/filter shared content from other teachers
- **Submit** — share your own lesson with the community (FERPA-aware; submission UI strips student data)

Currently catalog is local/manual; future cloud-sync planned.

### 3.35 Error Reporter (`error_reporter_module.js`)

426 lines — captures errors and routes to a Google Form for triage. Quiet but load-bearing infrastructure.

- **Auto-buffers** the last 50 errors (configurable via `MAX_BUFFERED`) — `console.error`, `unhandledrejection`, async-stack frames
- Optionally also captures `console.warn` (per-user pref `includeWarns`)
- Pre-fills a Google Form (`docs.google.com/forms/d/e/1FAIp.../viewform?usp=pp_url`) with: error log, browser+device, URL, screen size, last 15 errors-only
- Persistent log in `localStorage:alloflow_error_log` survives across sessions
- User-facing surface: AlloBot error-report button + Help → "Report a Problem"

This means Aaron actually receives every production error a real user encounters — even silently — provided they tap the report button.

### 3.37 Student Interaction Module (`student_interaction_module.js`)

297 lines — student-side submission + feedback flow:
- **`StudentSubmitModal`** — gives students a structured way to submit their work (history-aware: shows what they've done, what to attach)
- **`DraftFeedbackInterface`** — student-facing draft interface with AI feedback turns

### 3.38 Visual Panel Module (`visual_panel_module.js`)

1,300 lines — `VisualPanelGrid` (the panel view used by the Visual / Comic / Storyboard tools):
- 6-panel grid for sequential visual storytelling
- Per-panel refine / regenerate
- Editable labels with TTS
- Annotation overlay (initial annotations + change callback)
- Teacher Mode unlocks per-panel challenge submission
- AI integration via `callGemini`

### 3.39 View Modules — full inventory (28 view modules)

Each `view_*_module.js` registers a primary `XxxView` component on `window.AlloModules.XxxView`. The monolith renders these via `activeView === 'xxx'` switches. Comprehensive list:

| View Module | Component | Purpose |
|---|---|---|
| view_adventure_module | AdventureView | Adventure Mode story panel + choice handler |
| view_alignment_report_module | AlignmentReportView | Standards alignment report (CCSS/state) |
| view_analysis_module | AnalysisView | Text analysis output renderer |
| view_brainstorm_module | BrainstormView | Brainstorm output (cards, idea grid) |
| view_concept_sort_module | ConceptSortView | Drag-to-categorize concept-sort UI |
| view_dbq_module | DbqView | Document-Based Question interactive view (1,340 lines) |
| view_export_preview_module | ExportPreviewView | Pre-export visual review |
| view_faq_module | FaqView | Generated FAQ accordion |
| view_gemini_bridge_module | BridgeSendModal + BridgeMessageModal | Live teacher↔student bridge messaging (Round 6 extraction) |
| view_glossary_module | GlossaryView | Glossary terms with definitions, examples, audio (2,267 lines) |
| view_image_module | ImageView | Generated image viewer + refinement controls |
| view_launch_pad_module | LaunchPadView | Initial blank-state launchpad with featured prompts |
| view_lesson_plan_module | LessonPlanView | Full lesson plan editor + UDL sections |
| view_math_module | MathView | Math problem set with solver, scratchpad, hints |
| view_misc_modals_module | UDLGuideModal + AIBackendModal | UDL framework guide + Gemini API key configuration |
| view_misc_panels_module | PdfDiffViewer + GroupSessionModal + FluencyModePanel + SourceGenPanel + TourOverlay + VolumeBuilderView | 6 misc panels (Round 7 extraction) |
| view_outline_module | OutlineView | Outline tree (collapsible sections) |
| view_pdf_audit_module | PdfAuditView | The 6,205-line PDF audit modal (largest extraction) |
| view_persona_chat_module | PersonaChatView | Persona Chat conversation interface |
| view_project_settings_module | ProjectSettingsView | Project configuration panel |
| view_quiz_module | QuizView | Quiz player + grade results (3,311 lines) |
| view_renderers_module | ViewRenderers | Shared render utilities used across views |
| view_sentence_frames_module | SentenceFramesView | ELL/EL sentence frames with student fill-ins |
| view_sidebar_panels_module | 18 sidebar panels (Round 8 extraction) | All sidebar tool config panels |
| view_simplified_module | SimplifiedView | Simplified-text reader |
| view_spotlight_tour_module | SpotlightTourView | Onboarding tour overlay |
| view_timeline_module | TimelineView | Interactive timeline with revisions |
| view_word_sounds_preview_module | WordSoundsPreviewView | Word Sounds Studio entry preview |

### 3.40 Other Infrastructure Modules

| Module | Purpose |
|---|---|
| **gemini_api_module.js** (324 lines) | Wraps Google `generativelanguage.googleapis.com` calls; quota detection; auth fallback |
| **content_engine_module.js** (1,918 lines) | `createContentEngine(deps)` factory — central content + revision orchestrator |
| **timeline_revision_module.js** (551 lines) | `validateSequenceStructure`, `handleExplainTimelineItem`, `handleTimelineRevision`, `handleAutoFixTimeline`, `handleVerifyTimelineAccuracy` |
| **generate_dispatcher_module.js** (3,846 lines) | Central `handleGenerate(activeView, ...)` switch dispatching to per-view generators |
| **prompts_library_module.js** (221 lines) | `createPromptsLibrary(deps)` factory exposing prompt templates per view/mode |
| **adventure_handlers_module.js** (1,161 lines) | `AdventureHandlers` factory — all adventure-page interaction handlers |
| **adventure_session_handlers_module.js** (667 lines) | `AdventureSessionHandlers` for live multi-student facilitation |
| **safety_checker_module.js** (151 lines) | `SafetyContentChecker` — content moderation via Gemini Safety API + heuristics |
| **firestore_sync_module.js** (141 lines) | Firestore session sync (live sessions); uses Firebase SDK |
| **audio_banks_module.js** (387 lines) | `AudioBanks` — instruction-audio Proxy for ~60+ pre-recorded prompts |
| **voice_config_module.js** (132 lines) | `VoiceConfig` — voice-name catalog + per-voice config (TTS speed, pitch, language) |
| **ui_font_library_module.js** (399 lines) | `FONT_OPTIONS` — accessibility-aware font picker (OpenDyslexic, Lexend, Atkinson Hyperlegible, etc.) |
| **ui_language_selector_module.js** (140 lines) | `UiLanguageSelector` — multi-language picker bound to `LanguageContext` |
| **canvas_tips_module.js** (62 lines) | `CanvasTips` — Gemini Canvas-specific micro-tooltips (e.g., "click outside to keep edits") |
| **misc_components_module.js** (1,032 lines) | `AnimatedNumber`, `ClozeInput`, `WordSoundsReviewPanel` (canonical version with `onRegenerateManipulationTask`) |
| **large_file_module.js** (272 lines) | `LargeFileHandler` + `LargeFileTranscriptionModal` for >10MB PDF/audio uploads |
| **key_concept_map_module.js** (291 lines) | `KeyConceptMapView` — branch-based concept-map UI |
| **module_scope_extras_module.js** (260 lines) | Late-loaded helpers/utilities accessed via `window.AlloModules.ModuleScopeExtras.*` |
| **misc_handlers_module.js** (496 lines) | `MiscHandlers` — assorted small handler functions |
| **label_positions_module.js** (41 lines) | `LABEL_POSITIONS` — i18n-aware position constants for image annotations |

### 3.41 Escape Room Engine (`escape_room_module.js`)

2,267 lines — beyond the StudentEscapeRoomOverlay + EscapeRoomTeacherControls (in teacher_module), this provides the engine itself:
- **`createEscapeRoomEngine(deps)`** — factory producing a full puzzle-room engine
- **`useEscapeRoomTimer(deps)`** — React hook for synchronized countdown
- **`EscapeRoomGameplay`** — gameplay surface
- **`EscapeRoomDialogs`** — dialog system for puzzle reveals + hints

### 3.36 Generation Helpers (`generation_helpers_module.js`)

671 lines — exports a suite of `handleGenerate*` functions that drive content generation across views:
- **`handleGenerateMath`** — math problem generation with mode-aware prompting (simplify / solve / evaluate / factor / graph / compute / word_problem / prove / convert), includes per-problem `_verification` (verified/mismatch flags) and manipulative-support snapshots
- **`handleGenerateFullPack`** — full lesson-pack generator (Lesson DNA framework with target group, existing-history awareness, prior-analysis ingestion); generates Source → Analysis → Glossary → Quiz → Outline → all aligned artifacts in one batch

Both factor through a shared deps pattern — e.g., `mathInput`, `mathMode`, `history`, `callGemini`, `rosterKey.groups`, etc.

### 3.25 Teacher / Admin Module Components (`teacher_module.js`)

10 React components shipped from this 2,823-line module:

| Component | Purpose |
|---|---|
| **RosterKeyPanel** | Class-roster manager: import/export, group create/remove, per-group profile + metadata, per-student assignment, batch-generate per group |
| **SimpleBarChart** | Reusable a11y-friendly inline bar chart |
| **SimpleDonutChart** | Reusable inline donut chart with label slot |
| **ConfettiEffect** | Reduced-motion-aware celebration animation |
| **StudentEscapeRoomOverlay** | Live escape-room view shown to student during teacher-driven session; tracks streak, solved-puzzle count, time remaining |
| **EscapeRoomTeacherControls** | Teacher's controls during a live escape-room session: pause/resume, time adjust, hint dispense, end session |
| **TeacherLiveQuizControls** | Teacher's live-quiz controls: per-group resource push, language switch, profile push, group create/delete/assign; image generate/refine for prompts |
| **LongitudinalProgressChart** | Multi-session student-progress trend chart |
| **LearnerProgressView** | Per-student deep-dive: longitudinal progress + analytics + recent activity |
| **TeacherDashboard** | Top-level dashboard shell: lists students, opens deep-dive, opens Behavior Lens, swap views, generate per-student resources |

### 3.26 UI Modals Module Components (`ui_modals_module.js`)

5 React components for system-level modals:

| Component | Purpose |
|---|---|
| **StudentQuizOverlay** | Student-side quiz overlay with mode-styled UI (4+ visual modes) |
| **TeacherGate** | Auth gate that protects teacher-only views (passcode + role check) |
| **RoleSelectionModal** | First-launch role picker (Student / Teacher / Parent / Independent); includes mic-permission check |
| **StudentEntryModal** | Student onboarding modal: animal-name picker (adjective + animal) for anonymous identity |
| **StudentWelcomeModal** | Post-entry welcome screen for students |

All five register on `window.AlloModules` for monolith access.

### 3.24 Persona Chat — Quest & Rapport System (deeper detail)

`personas_module.js` — beyond the basic chat, implements a full simulation:

- **Quests** — each character has a `quests: [{ id, text, difficulty, isCompleted }]` array; quest difficulty is a rapport threshold the student must reach to "unlock" / satisfy the quest
- **Rapport tracking** — per-message rapport delta from Gemini grader (`charA: { rapportChange: int, completedQuestId: 'q1' | null }`)
- **Multi-character harmony** — when chatting with multiple characters in the same scene, harmony scores between character pairs evolve based on what the student says
- **Suggested Questions** — Gemini-generated 3 conversation-starter prompts per character
- **Quest completion** — automatic; the model judges whether the student's question/statement satisfies a Quest Objective
- **Cross-session persistence** — characters, quest state, rapport, harmony all preserved per project

This makes Persona Chat closer to a narrative role-play game than a chatbot — students aren't just talking to historical figures, they're earning their trust over time.

| Subsystem | Lines | Notes |
|---|---|---|
| **PDF Accessibility Audit Modal (extracted)** | ~7,189 source lines (Round 4) | Largest single feature; full audit pipeline + remediation + diff + chunk map + fidelity verification + ADA Title II legal context + Knowbility partner panels |
| **Doc Builder Insert Blocks** | Inline IIFE in monolith; per project memory off-limits to extract | 21-block picker; KaTeX/Prism lazy-CDN-loaded |
| **AlloBot Sage** | Roguelite where spells unlock from mastery in other STEM tools | `allobot_module.js`; cross-tool meta-game layer |
| **AlloHaven** | Cozy-room meta-experience: students earn 🪙 tokens by completing Pomodoro focus sessions OR writing reflection journal entries, then spend tokens on AI-generated decorations placed on a wall+floor grid. **6 decoration categories × 3 curated slots = 18 decoration types** with theme-aware art styles + hierarchical category→specific picker (e.g., Companion → Real animal/Imaginary creature/Stuffed companion → specific creature). **Phase 1 ships 4 layers**: cozy game, trophy case, portfolio, reflection journal. **~30 reflection prompts across 7 thematic categories**. Persistence: localStorage. Theme inherited from main AlloFlow theme. **Deliberately no leaderboards / streak punishment / peer comparison** — anti-toxic-gamification stance. | `allohaven_module.js` |
| **Symbol Studio** | AI-powered visual communication toolkit (Boardmaker alternative). **7,742-line module** with ~10 distinct internal features: AI symbol generation (PCS-style via Imagen + image-to-image), communication boards (multilingual labels), visual schedules, social stories, vocabulary boards, **Word Garden** (interactive vocabulary practice with animations), **Vocabulary Familiarity System** (track which words a student has mastered), **IEP Goal Tracking** (per-student communication goals), avatar/profile management (multiple student profiles with cloud sync), printable boards (print CSS for paper backup), export to JSON. Imagen-backed for symbol creation; supports image-to-image refinement. | `symbol_studio_module.js` |
| **StoryForge** | Student story-creation tool with AI illustration, narration, AI grading, storybook export. Teacher gallery for student submissions (FERPA-gated by `!_isCanvasEnv`). | `story_forge_module.js` |
| **Sample Lesson Library (`examples/`)** | Three pre-built starter lessons shipped in the repo: **civil_war.json**, **photosynthesis.json**, **water_cycle.json**. Plus `lesson_briefs.md` (lesson scaffold templates) and `readme.md` (usage). Could power the future Lesson Template Gallery (the §3 Onboarding suggestion). | Currently file-based; not exposed in UI yet | (Future) | `examples/*.json` |
| **Adventure Shop (collectibles)** | In-Adventure-mode collectible inventory items (tools, knowledge artifacts, social currency). Items defined dynamically via `ADVENTURE_SHOP_ITEMS` (loaded from CDN). Used as rewards for student choices in Adventure Mode narratives. | Auto in Adventure Mode at relevant story branches | Student | `ADVENTURE_SHOP_ITEMS` populated via `_upgradeAlloData` (CDN module) |
| **Behavior Lens** | FBA/BIP behavioral observation + data collection suite. **27,643-line module** with ~15 distinct internal tools/panels: ABCModal (Antecedent-Behavior-Consequence recording), ABCDataPanel (visualization), LiveObsOverlay (live observation), OverviewPanel (dashboard), FrequencyCounter, IntervalGrid, TokenBoard (token economy), HotspotMatrix (pattern identification), ExportPanel (data export), IEP-Ready FBA Report generator, SMART goals builder, reinforcement schedule library (FR/VR/FI/VI/DRO), 4 reinforcer category libraries (social/activity/tangible/sensory), 8-item classroom structure observation rubric (structure/schedule/rules/noise/seating/materials/transitions/positive-corrective ratio), 10-state student mood tracker, de-escalation skill rotation (empathy/listening/choice/rapport), RTI tier comparison (Tier 1/2/3 phase-change tracking), functional analysis A/B comparison, 5-tier XP/leveling system (Novice→Practitioner) | `behavior_lens_module.js` |
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
| `bakingscience` | Baking Science Lab | **7 sub-tools** (was 4 in earlier docs): Leavening Lab, Emulsion Mixer, Recipe Scaler, Oven Timeline, Bake Diagnosis, Gluten Lab, Browning Lab (Maillard vs. caramelization) | 6-12 |
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

### 4.6 Engineering & Technology (10 tools)

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
| `printingpress` | Printing Press | Gutenberg screw-press simulation with Guided Tour mode + 7 modules (mechanics, type-setting, ink/composition, pull/proof, People view with Gutenberg/Erasmus/etc., AD FONTES compose-stick challenge, Who-Said-This attribution game). Built for King Middle EL Education demo May 12 2026; ~2,023 lines. Atmospheric backdrop pass: planet-and-atmosphere layered glow. | 6-12 |

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
| `allobotsage` | AlloBot: Starbound Sage | Roguelite spell-crafter — retrieval-practice-as-combat. **19 spells** each tied to a different STEM tool's mastery (Quantum Leap, Gravity Well, Solar Flare, Nebula Cloak, Fraction Fire, Algebra Arc, Geometry Grasp, Road Ward, Signal Sigil, Hypermile Hex, Phonic Bolt, Rhyme Ring, Narrative Nova, Verb Vortex, Focus Flare, Context Cipher, Home Row Focus, Fluent Keys, Ready Words). **5+ regular enemies** (Void Imp, Data Gremlin, Star Wraith, Rune Moth, Signal Shade) + **3 named bosses** (Lichcopy, Void Leviathan, Paradox Clone). Multiple sectors with bossPool gating. Each spell-cast surfaces a quiz prompt from the linked tool's domain (e.g., reading-fluency questions to cast Phonic Bolt). | 6-12 |
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

### Multi-module STEM tool sub-feature breakdown

When sub-modules count as discrete features, the STEM count expands from 95 tools to ~140 distinct activities. Full enumeration:

**DNA / Genetics Lab — 11 sub-tools:** Build (sequence editor) · Replicate (DNA polymerase simulation) · Transcribe (DNA → RNA) · Translate (RNA → protein with codon table) · Mutate (point mutations + frameshift) · CRISPR (gene editing simulation) · Protein (structure folding viz) · Forensics (DNA fingerprinting) · Challenge (tiered quiz) · Battle (game-mode genetics combat) · Learn (concept reference by grade)

**Chemistry Lab — 8 sub-tools:** Balance (equation balancer with 3-tier difficulty: 7 sample equations from beginner Water Formation to AP Photosynthesis) · Reaction Types (5 types) · Stoichiometry (molar mass + mole calculator) · Molecular (ball-and-stick 3D models) · Lab Safety (GHS symbols + emergency response) · Challenge (3-tier chemistry quiz) · Element Battle (game mode) · Learn (concepts by grade)

**Punnett Square Lab — 8 sub-tools:** Punnett Cross (4 inheritance modes: simple dominance, incomplete dominance, codominance, sex-linked) · Pedigree (family tree builder + inheritance tracer) · Population (Hardy-Weinberg equilibrium simulator) · Trait Explorer (real genetic traits catalog) · DNA→Protein (codon table + translation) · Challenge (genetics quiz) · Gene Defense (battle mode) · Learn (concepts by grade). Plus 7+ achievement badges (First Cross, All Modes, Preset Explorer, Mendel, Test Crosser, Geneticist, Quiz Ace)

**Optics Lab — 8 tabs:** Reflection (plane + curved mirrors) · Refraction (Snell's law with 8 indexes: vacuum 1.00 → diamond 2.42) · Lenses (converging + diverging) · Wave Optics (interference, diffraction, polarization) · Color (additive + subtractive mixing) · Sample Problems (10 worked examples) · Glossary (25+ terms with cross-tagging by topic) · AP Quiz (30 items with AI grading)

**Baking Science Lab — 7 sub-tools:** Leavening Lab (acids + bases for rise) · Emulsion Mixer (oil + water chemistry) · Recipe Scaler (baker's percentages + unit math) · Oven Timeline (temperature → reaction stages) · Bake Diagnosis (troubleshoot what went wrong) · Gluten Lab (flour protein + kneading network development) · Browning Lab (Maillard vs. caramelization, with 6 substrate types: chicken skin, bread crust, caramelized onion, sugar syrup, roasted tomato, marshmallow)

**Economics Lab — 5 simulators + concepts library:** Supply & Demand (curve shifts + price floors/ceilings) · Personal Finance (budget + compound interest) · Stock Market (trading sim) · Business Sim (revenue/costs/profit) · National Economy (GDP + inflation + unemployment + monetary policy). Plus a concepts library of 12+ canonical terms (Scarcity, Opportunity Cost, Marginal Analysis, Incentives, GDP, Inflation, Unemployment, Comparative Advantage, Elasticity, Externalities, Public Goods, etc.) categorized as fundamentals/micro/macro/trade.

---

## 5. SEL Hub tools

32 tools + 2 infrastructure files. Accessed via the **SEL Hub modal** (`showSelHub=true`). Many cite specific clinical/research frameworks (CASEL, Neff, Dweck, Kuypers, Bridges, AFSP, SAMHSA, QPR, Sources of Strength, Olweus, Gilligan, Noddings, Rawls, Indigenous wisdom traditions).

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

### 5.2 Self-Management (8 tools)

| ID | Display name | Purpose | Grade band | Notes |
|---|---|---|---|---|
| `coping` | Coping Toolkit | 6 strategy types × 15+ strategies; Calm Plan builder; AI strategy matcher. **🎭 Rehearse tab** (May 13 2026): in-vivo coping-skill rehearsal where AI plays the TRIGGER itself (not a peer). 4 trigger configs: 🌀 **anxious voice in your head** (catastrophizing internal voice before a presentation/test; louder if argued with, quieter if named or grounded physically), 🔥 **escalating parent** (frustrated parent raising volume; de-escalates when student validates underlying concern without folding), 📵 **friend bailing on plans** (vague last-minute cancellation; opens up if student doesn't spiral, lashes out, or guilt-trip), 🎆 **sensory overload at school event** (the environment itself — pep rally bass drops, bleachers stomping; levels off when student names a grounding move). AI generates fresh scene + opener each playthrough; "🪶 Pause — coach me" surfaces a coping-specific technique to try in the moment; "End & reflect" gives 2-3 sentence reflection on what worked + one skill to try next time. Crisis-rehearsal-not-therapy disclaimer plus always-on resource footer with 988/Crisis Text Line. | K-12 | |
| `mindfulness` | Mindfulness Corner | Breathing animations (box / 4-7-8 / belly), body scan, 5-4-3-2-1 grounding, gratitude | K-12 | Web Audio bowls + chimes |
| `execfunction` | Executive Function Workshop | 6 tabs (Map/Start/Hold/Plan/Time/Coach); ADHD + planning paralysis + working memory | 3-12 | Barkley + Dawson framework |
| `goals` | Goals Setter | SMART goals, habit-streak counter, AI coach, vision board, goal buddy | K-12 | |
| `advocacy` | Advocacy Workshop | Branching scenarios (silent/aggressive/assertive), script builder, rights ed | K-12 | |
| `transitions` | Transitions Workshop | Change Curve (Kubler-Ross/Bridges adapted); 8 change types + coping anchors | K-12 | |
| `selfadvocacy` | Self-Advocacy Studio | IDEA, FAPE, LRE, Section 504; IEP/504 plans; accommodation requests; disclosure decisions; transition planning. **Practice tab Rehearsal mode** (May 12 2026): every existing Practice scenario gained a "Start rehearsal →" button that opens a multi-turn role-play with AI playing the OTHER person specific to that scenario. 12 hand-cast peer characters — middle school: busy math teacher who hasn't read the 504, skeptical-but-fair teacher for retakes, slightly-defensive teacher for seat change, curious-not-malicious friend asking about accommodations, warm case manager prepping for IEP, no-exceptions substitute. High school: friendly college Disability Services intake, openly-resistant calculus teacher refusing IEP, friendly internship interviewer, busy non-specialist pediatrician, well-meaning counselor pushing community college, romantic partner of a couple months. Each character has a tuned disposition (softens vs hardens by turn 4-5 depending on whether the student advocates effectively). Send → / 🪶 Break character — coach me / End & reflect. Complementary to existing Write-and-Critique flow. | 6-12 | Print-friendly CSS |
| `digitalWellbeing` | Digital Wellbeing Studio | Internal-regulation companion to safety.js: social media moderation / FOMO / doom-scrolling / sleep impact, recognizing online harm to mental health, cyberbullying recovery, media literacy (AI-generated content, engagement bait, lateral reading), crisis hand-off when online experiences turn dangerous | 6-12 | Scoped stylesheet (`.dw-root`); platform-specific cards (Instagram, TikTok, Snap, Discord, Roblox); complements `safety` which covers external hazards |

### 5.3 Social Awareness (4 tools)

| ID | Display name | Purpose | Grade band | Notes |
|---|---|---|---|---|
| `community` | Community & Culture | Cultural awareness, identity mapping, navigating differences | K-12 | Anti-racist, microaggression literacy |
| `cultureexplorer` | Culture Explorer | AI deep dives into world cultures with Imagen + TTS pronunciations | 3-12 | 7 regions × 8 lenses |
| `upstander` | Upstander Workshop | Bullying through 3 lenses (target/perpetrator/bystander); upstander moves. **🎲 Generative Scenarios** (May 12 2026): student picks any 2-3 of setting (10: cafeteria/hallway/classroom/gym/bus/recess/lockers/bathroom/sports/party), relationship (8: close friend / friend group / classmate / higher or lower social status / sibling / teammate / new student), kind of harm (9: exclusion / mocking / rumor / physical intimidation / appearance-based / family put-downs / pressure to join in / punching-down humor / friendship manipulation), plus optional free-text. AI returns a fresh 4-choice scenario in the SAME rated/feedback format as the 9 hand-crafted ones. Validation rejects malformed JSON or missing rating distribution. **🎭 Rehearse tab** (May 11-12 2026): multi-turn role-play where AI plays a peer character. 3 roles — 🛡️ **AI plays someone being cruel (you intervene)**, 🤝 **AI plays someone who just got bullied (you support them)**, 🪞 **AI plays a friend going along with it (you push back)**. AI generates fresh scene + opener each playthrough (variation in setting, target name, trigger detail). Send → / 🪶 Break character — coach me / End & reflect. Bridge button "Try this as a role-play →" on every generated scenario carries the scenario setup over as the scene. **AI Coach tab renamed** from "Safe Space" → "Talk it through" May 13 2026 (the old name implied adult oversight that doesn't exist in solo mode). | K-12 | Cites Olweus, Hawkins; APA Zero Tolerance critique |
| `ethicalreasoning` | Ethical Reasoning Lab | Dilemmas + frameworks; stakeholder mapping; AI Socratic dialogue | K-12 | Mill, Kant, Aristotle, Gilligan, Noddings, Rawls, bell hooks, Ubuntu |

### 5.4 Relationship Skills (8 tools)

| ID | Display name | Purpose | Grade band | Notes |
|---|---|---|---|---|
| `conflict` | Conflict Resolution Lab | Branching conflict scenarios; I-statement builder; de-escalation; repair | K-12 | |
| `conflicttheater` | Conflict Theater | Immersive multi-NPC mediation with persistent personalities, body language, harmony meter, restorative scoring | 6-12 | **MVP v0.1** — 1 scene (cafeteria), 1 scenario, 2 characters; Phase 2 pending |
| `friendship` | Friendship Workshop | 6 friendship styles self-assessment; conversation starters; repair/forgiveness. **🎭 Rehearse tab** (May 13 2026): multi-turn role-play with AI playing the friend in 6 high-frequency real-life friendship conversations students avoid because they don't know how to start. 💬 **New person, new invite** (potential friend; says yes if invite is specific + low-pressure, hedges if vague), 🩹 **Repair after a fight** (friend still hurt; tests if apology is real or performative), 🛡️ **Setting a boundary** (boundary-pushing friend who borrows / cancels / pulls into drama; defensive when called on it but adjusts if named without attacking their character), 💔 **Naming the hurt — left out** (friend who was at the group hang you missed; engages honestly if hurt is named without guilt-tripping), 🪞 **Calling in, not calling out** (friend who messed up — joke at someone's expense; defensive at first, softens if kept private + specific + shame-free), 🌱 **Reaching out after months** (old drifted friend; re-engages easily if kept light). Each character has a tuned disposition for "stay consistent or harden" if student lectures, threatens the friendship, or attacks character. Casual texting-style guidance in prompts (lowercase) for text scenarios. Complementary to the existing AI Practice tab (which is Q&A advice, not in-conversation simulation). | K-12 | ASD + ADHD social communication aware |
| `social` | Social Skills Lab | Conversation starters, listening challenges, body language decoder, cooperation scenarios | K-12 | Socially anxious / neurodivergent supportive |
| `sociallab` | Social Lab (Pragmatic Language) | Two-tier: static branching scenarios + AI roleplay; ASD pragmatic focus | 3-12 | 8 skill categories |
| `peersupport` | Peer Support Coach | OARS (Open / Affirmation / Reflection / Summary) skills; safety signal training; 5-step safety response | 6-12 | Teen MHFA + MI + Sources of Strength + QPR |
| `teamwork` | Teamwork Builder | Team role discovery; collaborative challenges; team contracts | K-12 | |
| `restorativecircle` | Restorative Circle Process | Circle types (community/repair/celebration/academic/check-in); talking piece traditions; Indigenous roots education. **🎭 Rehearse tab** (May 12 2026): multi-turn role-play tailored to restorative dynamics (distinct from bullying or peer dynamics). 3 roles — 🪶 **Practice being the facilitator** (AI plays a defensive participant in a circle who minimizes the conflict; softens only if facilitator asks open, curious, non-blaming questions), 🩹 **Practice taking accountability** (AI plays the person you hurt — quiet, hurt, distrustful; tests if the apology is real or performative; softens when impact is named, not when excuses arrive), 👂 **Practice listening when someone shares their hurt** (AI plays a peer telling you why something hurt; shuts down if defended or fixed, opens up if just reflected back). Coach prompts include role-specific reminders ("Restorative facilitation centers curiosity over judgment", "Real accountability is naming what you did, naming the impact not the intent", "Restorative listening is reflecting back what you heard before you respond"). Reflection prompts use "curious, not corrective" framing. AI character descriptions explicitly forbid pre-forgiveness so students can't shortcut to easy resolution. | K-12 | Honors Navajo Peacemaking, Haudenosaunee, Maori hui, Aboriginal Australian practices |

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
| `sel_safety_layer.js` | Shared safety infrastructure used by every AI-coaching surface across SEL Hub. **12 exported functions** (was 9 before May 13 2026 expansion): `hasCoachConsent()` / `giveCoachConsent()` (consent gate before AI coaching), `renderConsentScreen()` (consent UI), `assessSafety(message, band, toolId, callGemini)` (Gemini-powered triangulated tier detection — categorizes student messages by risk level), `parseTier()` (interpret safety assessment response), `storeTranscript()` / `getTranscript()` / `getAllTranscripts()` (persistence for flagged interactions — for school-counselor follow-up), `safeCoach()` (wrapped coach function that pre-checks via `SafetyContentChecker` + calls assessSafety in parallel + appends crisis text on tier-3), `renderCrisisResources()` (loud red 988 / Maine Crisis Line / NAMI Maine / Trevor Project / Crisis Text Line block, role=alert, aria-live=assertive), `renderResourceFooter()` (quieter always-on resource strip for sensitive-content tools), `getSessionFlagLog()` (per-session flagged-message log). **New May 13-14 2026**: `safeRehearseCheck(message, opts)` — synchronous regex-only gate (no extra LLM call) for use in Rehearse/role-play sendTurn handlers; returns `{ action: 'block' \| 'nudge' \| 'continue', severity, flag }`. Critical-tier content blocks the AI call entirely; high-tier content lets the AI turn proceed with a soft "talk to a trusted adult" nudge appended. Fires `onSafetyFlag` through the same pipeline as `safeCoach`. `rehearseBreakCharacterText(severity)` — single-source-of-truth coach break-character message used across all 28+ wired surfaces, so the warm/non-judgmental tone is consistent. `renderSafetyDisclosure(h, band, activeSessionCode)` — conditional honest disclosure (solo mode: "This conversation stays on your device, we run safety checks for crisis words, please talk to a trusted adult for real safety concerns" / live-session mode: "Your teacher is hosting a live session, anything you save or submit can be seen by them, ..."). Replaces the prior misleading "this space is monitored for your safety" copy that shipped in 5 tools (Upstander, Compassion, Friendship, Transitions, Growth Mindset) until May 13 2026 |
| `sel_hub_module.js` | Registry shell + modal frame + tile grid layout. **Added May 13 2026**: `activeSessionCode` is now received as a prop from the monolith (parallel to `studentCodename` and `selectedVoice`) and threaded into the plugin `ctx` object so every SEL tool can render the correct truthful safety disclosure depending on whether a teacher is actively hosting a live session |

### 5.8 Cross-cutting safety pipeline (added May 13-14 2026)

A single regex-based safety gate (`window.SelHub.safeRehearseCheck`, backed by `window.SafetyContentChecker` on `window.__alloShared`) now protects **33 student-free-text AI surfaces** across **18 SEL Hub tools** plus **1 STEM Lab surface**. Critical-tier content (self_harm or harm_to_others keyword categories) aborts the AI call, swaps the output for a coach-style break-character message, surfaces the loud red crisis-resources block (988 / Crisis Text Line / trusted adult), and fires `onSafetyFlag` (which writes to `localStorage` in solo mode and surfaces to a hosting teacher in live sessions). High-tier content (bullying, concerning_content) lets the AI turn proceed but appends a soft "if this is close to real, talking to a trusted adult is always an option" reminder.

**Wired surfaces inventory:**

| Tool | Surfaces | Notes |
|---|---|---|
| Upstander | 4 | Legacy AI coach ("Talk it through"), AI Rehearsal (Moves tab), AI Apology Coach (Repair pathway), Rehearse tab sendTurn |
| Restorative Circle | 2 | Facilitator Q&A, Rehearse tab sendTurn |
| Self-Advocacy | 2 | Practice critique, Rehearse mode sendTurn |
| Coping | 3 | Thought-Flipper AI, Self-Talk AI, Rehearse tab sendTurn |
| Friendship Workshop | 2 | Legacy AI Practice coach, Rehearse tab sendTurn |
| Compassion | 1 | AI Compassion Coach |
| Transitions | 1 | AI Support coach |
| Growth Mindset | 1 | AI Growth Coach |
| Mindfulness | 1 | Gratitude journal AI |
| Digital Wellbeing | 1 | Comparison-thought reframe AI |
| Perspective | 3 | Coach situation describe, journal reflection AI, scenario-response evaluator |
| Social | 2 | Conversation drafts, life-listening drafts |
| Social Lab | 1 | Multi-turn peer roleplay sendChat |
| Strengths | 3 | Coach question, interview answers, full story draft |
| Teamwork | 3 | Role reflection, teamwork challenge, conflict description |
| Culture Explorer | 1 | Follow-up question |
| Goals Setter | 1 | Goal coach Q&A |
| Journal | 1 | AI Insight from mood check-in summary (defense in depth on top of existing assessSafety LLM tier check) |
| Emotions Explorer | 1 | Emotion Coach on student journal draft (defense in depth on top of existing assessSafety LLM tier check) |
| Conflict Studio | 2 | Role-play sendRPMessage + mediation sendMedMessage (defense in depth on top of existing assessSafety) |
| Conflict Theater | 1 | Multi-character sendTurn — break-character on first responder if critical |
| **STEM Lab** | | |
| LLM Literacy Lab | 1 | Temperature playground (only STEM AI surface explicitly invites "type ANY prompt"; AlloBot Sage audited and confirmed safe — quiz-gen not chat) |

**Coverage architecture**: every tool that captures `safeCoach()` results now also stores `result.tier` into a tool-local `_lastTier` state field (or appends a `_crisis` marker into chat history for tools using `React.useState` directly like Social Lab). The crisis-resources render is conditional on `_lastTier >= 3` and is placed at the top of each tool's render so it persists across sub-tab navigation. For tools that don't have `_lastTier`-style state (Social Lab specifically), the chat-render explicitly handles `msg.role === 'coach'` entries and embeds `renderCrisisResources` inline.

**Defense in depth**: every legacy coach tab's `else { callGemini(...) }` fallback path (used only if `window.SelHub.safeCoach` somehow doesn't load) was hardened to call `safeRehearseCheck` synchronously before the unguarded `callGemini`, so even the failure path has at least keyword-level protection.

**Disclosure rewrite**: the previously-shipped "This space is monitored for your safety" copy in 5 AI-coach intros (Upstander, Compassion, Friendship, Transitions, Growth Mindset) was misleading in solo mode (no adult was monitoring; the keyword check writes to `localStorage` only). All 5 now call `renderSafetyDisclosure` which picks the truthful variant based on `activeSessionCode`. Upstander's coach tab title also renamed from "Safe Space" → "Talk it through" because the old label implied adult-supervised safety the tool doesn't actually provide.

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
6. **`Report Writer` never loaded** — `build.js` declared it but no `loadModule('ReportWriter', ...)` call existed, causing a perpetual "Loading Report Writer…" fallback; fixed by adding the missing loadModule call near BehaviorLens (this session)
7. **Immersive Reader Speed/Bionic null-overwrite** — build script's tail re-registered `SpeedReaderOverlay`/`BionicChunkReader` to `null` because those vars don't exist in IIFE scope; removed the redundant block — source-level aliases to `FocusReaderOverlay` now survive (this session)
8. **Teacher Dashboard / Educator Hub completely unreachable** — `teacher_module.js` defined 11 React components but only registered the breadcrumb `TeacherModule = true`; all 10 teacher-facing components rendered perpetual "Loading…" fallbacks (Teacher Dashboard, Roster Key Panel, Learner Progress, Live Quiz Controls, etc.). Largest single bug in the session — fixed by adding the 11 missing `window.AlloModules.X = X` assignments to the registration tail
9. **WordSoundsReviewPanel "regenerate manipulation task" button silently broken** — `word_sounds_setup_module.js` registered an older copy of the panel (lacking the `onRegenerateManipulationTask` prop) AFTER `misc_components_module.js` registered the canonical copy. Last-write-wins → consumers passed the prop but it was discarded. Fixed by removing the stale duplicate registration from word_sounds_setup
10. **`view_misc_modals_module.js` null-registered `GroupSessionModal` + `PdfDiffViewer`** — those components live in `view_misc_panels_module.js` which loads later; only-by-accident this didn't break in production. Tightened registration to only the components this module actually defines (UDLGuide + AIBackend)
11. **`GeminiBridgeView` was deleted but consumer survived** — Round 6 extraction overwrote `view_gemini_bridge_module.js` with the new BridgeSendModal/BridgeMessageModal, dropping the original GeminiBridgeView render. The monolith still referenced `window.AlloModules.GeminiBridgeView` at L24258, so navigating to a saved `gemini-bridge` history item rendered nothing. Fixed by inlining the original 43-line terminal-card render directly into the monolith (recovered from git commit `1a26f5d`)

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
- **CDN architecture (May 12 2026 migration):**
  - **Primary:** Cloudflare Pages at `alloflow-cdn.pages.dev` (faster edge cache, no per-org rate-limit, no 25 MiB-per-file concern for typical modules)
  - **Fallback:** jsdelivr/GitHub raw (kept for redundancy in case Cloudflare is unreachable)
  - 25 MiB per-file cap on Cloudflare Pages; m4a / mp4 / onnx assets are gitignored and not served via CDN
  - All module files git-pinned at commit hashes for reproducibility (deploy.sh rewrites `loadModule('X', 'https://.../X_module.js')` URLs to include the commit hash)
- **Build pipeline:** `prismflow-deploy/public/*` files are auto-synced from repo-root sources by a `build.js` watcher; edit ROOT files only (deploy mirrors get silently overwritten within seconds otherwise)

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

---

## 10. Annotation Suite

Cross-cutting feature shipped across 7 phases on May 14-15 2026. Lives in `annotation_suite_source.jsx` → `annotation_suite_module.js` (CDN module, ~1,117 lines compiled), plus a parallel vanilla-JS runtime baked into `doc_pipeline_source.jsx` for the export side. Data envelope: `{id, kind, x, y, author, authorName, createdAt}` shared across all annotation types; kind-specific fields layered on (notes get `content + color`, highlights get `rects + text + color`, voice notes get `audioBase64 + mimeType + durationSec`).

### 10.1 Annotation kinds

| Kind | Surface | Description |
|---|---|---|
| `sticker` | in-app | Decorative 4-emoji stamp (⭐ ✅ 💡 ❤️). Pure decoration; no content field. |
| `note` | in-app + export | Sticky-note bubble with inline editor (4 color palettes). Click-to-place, click-to-expand-and-edit. |
| `highlight` | in-app + export | Multi-rect text-selection overlay (4 color palettes). Drag-to-select; hover-to-delete via corner X. |
| `voice` | in-app + export | 60-second audio note recorded via MediaRecorder, stored as base64, played via `<audio>` element. No cloud round-trip. |

### 10.2 In-app annotation toolbar

Located in the main app output-area header. Toggle buttons cycle one of: `''` (off) / `'sticker'` / `'note'` / `'highlight'` / `'voice'`. Sub-controls appear contextually when the mode is active:
- **Sticker mode**: 4 icon picker buttons + Clear All.
- **Note mode**: 4 color swatches + Templates dropdown (role-aware: teacher gets grading stamps like "⭐ Great work!", "🧮 Show your work"; student gets reflection stamps like "❓ Question", "💡 Reminds me of…") + Clear All.
- **Highlight mode**: 4 color swatches + Clear All.
- **Voice mode**: cursor switches to crosshair; click drops a placeholder and starts recording via the existing `useAudioRecorder` hook (same battle-tested mic + permission infra fluency uses).

Additional toolbar controls: **↩ Undo** (Ctrl/Cmd+Z), **📋 List** (opens sidebar; count badge shows total).

### 10.3 Sidebar (in-app + export)

Floating right-edge panel, 300px, max 100vh-120px tall. Lists every annotation grouped by author with click-to-jump (smooth-scroll + indigo pulse ring at the target). Filter pills: All / Teacher / Mine. Per-item delete with permission gating (students can only delete their own; teachers can delete any). In-app header has 📂 **Import** button (loads a student's downloaded annotations JSON via hidden file input); export header has Close.

### 10.4 Export-side runtime

Vanilla-JS IIFE baked into the exported HTML by `doc_pipeline_source.jsx`. Reads teacher annotations from an embedded `<script type="application/json" id="alloflow-teacher-annotations">` blob; loads student annotations from `localStorage` (key `alloflow-annotations|<docTitle>|<bodyLen>`). Renders both layers with kind-dispatch matching the in-app `Overlay`. Teacher annotations are frozen (read-only); student annotations are fully editable + draggable.

Export toolbar (in the Reading Tools strip): theme switcher (4 themes) + annotate row (Off / Note / Highlight / Voice / Undo / Mine / List / Save mine) + conditional color-swatch row for note + highlight modes. **⬇ Save mine** downloads `<docTitle>_annotations.json` for student → teacher sharing back.

### 10.5 Save / Load workflow

- **In-app save**: Stickers ride the project JSON via `executeSaveFile` ([phase_k_helpers_source.jsx:752+](phase_k_helpers_source.jsx)) — both teacher and student save flavors include `stickers: [...]`.
- **In-app load**: `handleLoadProject` ([misc_handlers_source.jsx:154](misc_handlers_source.jsx)) calls `setStickers(rawData.stickers || [])`.
- **Import**: `_m.importAnnotations(existing, payload, { forceAuthor: 'student' })` — accepts either bare array or wrapped `{annotations: [...]}`; dedupes by id; tracks provenance via `importedFrom + importedAt`.
- **Migration**: `migrateLegacyShape(annotations)` stamps `kind: 'sticker'` on pre-Phase-3 saves that lack the field.

### 10.6 Voice note privacy guarantees

Zero network calls in the voice path. `MediaRecorder` → `Blob` → `FileReader.readAsDataURL` → base64 → React state → project JSON / localStorage. MediaStream tracks explicitly released on stop or cancel. 60s recording cap (`VOICE_MAX_SECONDS`); 500 KB base64 size cap (`VOICE_MAX_BYTES`). Refuses to attach over-size clips with a clear warning.

### 10.7 Drag-to-reposition (May 15 2026)

Stickers, notes (collapsed), and voice bubbles (collapsed) all draggable when annotation mode is off. Permission: students can drag their own; teachers can drag anything in their view; export-side cannot drag teacher annotations (frozen). Implementation uses DOM-only style mutation during the drag (no React state churn) and commits a single setState on `pointerup`, so the undo stack records one snapshot per drag rather than ~60 intermediate positions. Position is clamped to host `scrollWidth × scrollHeight` so annotations can't be lost off the bottom-right edge.

### 10.8 Undo (session-only, both surfaces)

20-slot snapshot stack. In-app: `useEffect` auto-snapshots the previous stickers state on every change, with an `isUndoingAnnotationRef` flag to prevent the undo itself from being recorded. Export: explicit `snapshot()` calls before each mutation entry point. **Ctrl/Cmd+Z** keyboard shortcut on both surfaces, scoped to ignore presses inside text fields so native browser undo still works during typing.

### 10.9 Module surface (window.AlloModules.AnnotationSuite)

Components: `StickerNode`, `NoteBubble`, `HighlightOverlay`, `VoiceNoteBubble`, `RecordingOverlay`, `Overlay`, `Toolbar`, `Sidebar`. Helpers: `createStickerFromClick`, `createNoteFromClick`, `createHighlightFromSelection`, `createVoicePlaceholder`, `attachAudioToVoiceNote`, `importAnnotations`, `updateAnnotation`, `removeAnnotation`, `migrateLegacyShape`, `focusAnnotation`, `countByAuthor`, `annotationPreview`, `buildStickerTitle`. Constants: `STICKER_ICONS`, `STICKER_TYPES`, `NOTE_COLORS`, `NOTE_COLOR_KEYS`, `HIGHLIGHT_COLORS`, `HIGHLIGHT_COLOR_KEYS`, `ANNOTATION_KINDS`, `TEACHER_NOTE_TEMPLATES` (9 grading stamps), `STUDENT_NOTE_TEMPLATES` (6 reflection stamps), `VOICE_MAX_SECONDS`, `VOICE_MAX_BYTES`.

---

## 11. Doc Pipeline export-side capabilities

Significant expansion in May 14-15 2026 of what the exported HTML does at student-load time. All shipped via `doc_pipeline_source.jsx` → rebuilt to `doc_pipeline_module.js` (~16,997 lines).

### 11.1 In-doc theme switcher (Reading Tools)

Sticky toolbar at the top of every exported lesson with 4 themes (☀ Light / 🌙 Dark / 📜 Sepia / ◼ High Contrast). Light = teacher's chosen `exportTheme` baseline. Dark uses slate-900 with full table/card/MCQ overrides. Sepia uses parchment cream tones (low-glare, dyslexia-friendly). High Contrast targets WCAG AAA with 2px black borders + black-on-yellow row hover. Selection persists via `localStorage` (`alloflow-reading-theme`). OS-responsive default: `prefers-color-scheme: dark` opens in Dark on first load when no saved preference. Anti-FOUC inline init script applies theme before body paints.

### 11.2 Resource-specific image-size controls

`cfg.glossaryImageSize`, `cfg.timelineImageSize`, `cfg.conceptSortImageSize` — each accepts `'small' / 'medium' / 'large' / 'xl'` mapped to pixel sizes (40/64/96/140 for glossary; 48/64/96/140 for timeline; 56/80/110/150 for concept-sort). Wired through Export Preview UI as 4-button SMLXL strips with color-keyed selection (emerald for glossary, indigo for timeline, rose for concept-sort).

### 11.3 Resource visual refresh

- **Glossary table**: scoped CSS overrides global zebra (opaque slate-50 even rows, slate-100 hover), header gets emerald-50→100 gradient + 2px lower border, term column bold emerald accent, image cell with white inner pad + light gray border + soft shadow + 1.08× hover scale.
- **Generic table block**: global zebra/hover changed from `rgba(...,0.5)` to opaque `#f8fafc / #f1f5f9` — fixes muddy-dark-gray rendering everywhere.
- **MCQ option labels** (`.mcq-label`): `:focus-within` indigo glow (WCAG 2.4.7), `:has(input:checked)` background + bold weight + ✓ prefix (WCAG 1.4.11).
- **Brainstorm grid cards**: 4px top accent in cycling 8-color palette, numbered "Idea N" pill badge, hover lift (translateY -2px + 6/18 shadow), bolder title.
- **Timeline strip**: image-size cfg wired (both list mode and cuttable-strips mode).
- **Quiz-box**: indigo top accent + lifted shadow (matches brainstorm).
- **FAQ panels**: caret rotates 180° on open with color shift, expanded state gets cyan left accent + white bg, hover tints cyan, full theme-aware overrides for dark/sepia/HC.
- **Reflection blocks** in quiz: subtle indigo left-bar accent + soft bg tint.
- **Muted text**: 32 sites bumped from slate-400 (#94a3b8, 2.6:1 fails AA on white) → slate-500 (#64748b, 4.6:1 passes AA both light + dark).

### 11.4 Annotation runtime

See §10.4 above. All four annotation kinds render inside the exported HTML; student can place notes/highlights/voice notes that persist locally. Sidebar mirrors the in-app version with theme-aware overrides (light/dark/sepia/HC).

---

## 12. Physics + Flightsim refinements

### 12.1 Physics Lab (`stem_lab/stem_tool_physics.js`) — Target Mode + pedagogy expansion

**Bug fixes:**
- **Stale `_onTargetLand` closure** rebound on every canvasRef call (was bound once at first mount; `d.targetList` was null, so hits silently no-op'd AND the write-back overwrote live state with a stale snapshot — root cause of "projectile passes through targets" + "first target disappears on launch").
- **Mid-flight collision** added in the physics step: ball intersecting a crate's volume (`|ball.mX - target.x| ≤ target.radius` AND `ball.mY ≤ 2.5m`) snaps to target position so the existing landing branch handles the hit. Projectiles no longer fly through crates.

**New pedagogy features (10+):**
- **Live "Show Your Work" formulas panel** (📝 toggle): Range / Max Height / Flight Time each displayed in 3 forms (symbolic → values-substituted → numeric), updating live as sliders move.
- **Predict-then-launch**: input next to Launch button; snapshot at launch + comparison on landing; tiered XP (bullseye ≤5% +25 XP, close ≤15% +10 XP, miss reset streak); 🔮 streak counter.
- **Trajectory comparison overlay** (📈 Compare): past trails tagged with `{angle, velocity, gravity, drag}`; brighter alpha + HSL hue by angle (red 0° → blue 90°); labeled apex chip per trail; cap 5 trails + 🧹 Clear button.
- **Predicted-landing pin**: fuchsia dashed pin at the closed-form R when Show Work panel is open; slides live with slider changes.
- **No-drag ghost trajectory**: when drag is on + projectile in flight, faint white dashed parabola of the ideal vacuum trajectory alongside the actual trail. Direct visualization of drag's effect.
- **Slow-motion / pause / step**: 1× / ½× / ¼× / ⏸ button group; ⏭ Step button advances one tick when paused (one-shot via `_stepNext` flag in draw loop).
- **Symmetry Demo button**: auto-fires current angle, then 90°−θ at same velocity; overlay mode auto-enables; toast names the insight after the second land ("Same range! 30° and 60° are complementary…"). Refuses to run at 45°.
- **Apex annotation chip**: detects `Vy` zero-crossing, pins crosshair + chip showing `H = … m`, `t = … s`, `Vy = 0 (Vx = … m/s)`. Fades over 3 seconds.
- **Motion component graphs** (📉 Motion): SVG charts of `Vx-vs-t` (flat) and `Vy-vs-t` (linear, crosses zero). Caption: "Horizontal and vertical motion are independent. Gravity only affects Vy."
- **Range-vs-Angle parameter sweep**: third sub-chart inside Motion panel; plots R(θ) across [0°, 90°] at current velocity/gravity; current-angle marker + 45° optimum reference line + drag-aware footer caption.

### 12.2 Flightsim / Skylab fixes

- **Crepuscular sun rays bleaching the ground**: `globalCompositeOperation = 'lighter'` rays drew triangles all the way to `H * 1.1`, washing the grass/runway near-white. Added a `gfx.clip()` to the sky region (`0 → horizonY`) so rays now stop at the horizon; dropped strength 0.28 → 0.18.
- **Takeoff jolt**: `horizonY` was computed from raw `ctrl.pitch` (raw control input slewing +30°/sec). Added `horizonYRef` and damped the rendered horizon with `0.88 * prev + 0.12 * target` so climb-out pans smoothly. PFD artificial horizon still reads `ctrl.pitch` directly so instruments stay snappy.
- **Motion cue strengthened**: runway centerline-dash scroll multiplier bumped from `speed * 0.015` to `speed * 0.045` so optical flow is obvious even at taxi speed.

### 12.3 Launch pad bug (resolved)

The Learning Tools card's `onClick` deferred `setShowLearningHub(true)` through `setTimeout(..., 0)`. The first four setters caused the launch pad to unmount and the main app to mount immediately; the modal flag was queued as a separate task, so the user saw the main app first and the modal only appeared on the next React commit cycle (often requiring another interaction). Fix: removed the `setTimeout`, reordered so the modal flag is set first, in the same React batch. Rebuilt via `node build_view_launch_pad.js`.

---

## 13. May 14 – May 17 2026 additions (this inventory revision)

This section catalogs the substantial feature work landed in the 3-day window
following the May 14 inventory baseline. ~200 commits across new "20K MILESTONE"
curriculum tools, teacher-dashboard expansion (10 rounds), comprehensive WCAG
contrast audit + bulk fixes, two-pass i18n localization, help-mode coverage
expansion, single-source-of-truth tool catalog, and architectural cleanup.

### 13.1 New "20K MILESTONE" curriculum platforms (8 tools, ~160K lines)

Each tool below crossed the 20,000-line threshold and is now a self-contained
multi-week curriculum platform rather than a single-purpose simulator. All 8
share a hub-and-spoke navigation pattern (category cards → filtered subnav →
breadcrumb + search) added in commit `794d2214` to eliminate the
"90-button-in-a-row scan problem."

| Tool | Lines | Focus |
|---|---|---|
| `stem_tool_chembalance.js` | 20,377 | 38 subtools incl 118-element encyclopedia, periodic table, AP chem, 200+ quiz Qs, 60+ chemists, 120 compounds, 100 reactions, 50 history events, 80 careers, 100 safety scenarios, 80 mechanisms, lab kits, mythbusters, organic/biochem/thermo/kinetics/equilibrium/gas laws/solutions/nuclear/env chem/pharma/materials/food/forensic |
| `stem_tool_raptorhunt.js` | 20,350 | 90+ sections incl Rescue Tree (12 scenarios), Age & Plumage (14 species), Molt Atlas, Wing Formula, Audio Guide (16), Hot Spots (10 regions), 200+ vocabulary, Banding Codes (40); first-person view, target lock, zoom, underwater fish, arrow-key steering, ground physics |
| `stem_tool_cell.js` | 20,210 | 13 modes incl 60-organism encyclopedia, biologists, lab techniques, disease, ecology, organism filtering, compare mode, history, glossary, finale; uniform microscope-slide vignette across modes |
| `stem_tool_platetectonics.js` | 20,008 | 30+ topical tabs incl faults, tsunamis, hotspots, volcanoes, mountains, rocks, fossils, Maine geology, Cascadia, indigenous knowledge, women in geoscience, expeditions, national parks, critical minerals, preparedness |
| `stem_tool_applab.js` | 20,006 | App-building curriculum with v3.0 UX reorg, hub navigation, search across 100+ sections |
| `stem_tool_nutritionlab.js` | 20,004 | My Nutrition Kit — 249 personal tools + 8 reference libraries; physiology-first NEDA-aligned |
| `stem_tool_cephalopodlab.js` | 20,004 | Comprehensive cephalopod biology + behavior + research curriculum |
| `stem_tool_learning_lab.js` | 20,037 | My Toolkit — 99 personalized student tools shipped across 22 deployment waves |

### 13.2 SEL Hub personalization "Kit" pattern (3 new tools)

Following Learning Lab's My Toolkit precedent:

| Tool | What |
|---|---|
| `sel_tool_selfadvocacy.js` "My Advocacy Kit" | 8 personalized student tools as default tab (+858 lines) |
| `sel_tool_crisiscompanion.js` "My Safety Kit" | 6 personal crisis-support tools |
| `stem_tool_nutritionlab.js` "My Nutrition Kit" | 249 personalized nutrition tools |
| `stem_tool_learning_lab.js` "My Toolkit" | 99 personalized learning tools |

Combined: **~360+ personalized student tools** following the same authoring
pattern — student-facing default tab with their own scaffolds that persist
across sessions. Counter to the typical EdTech "teacher creates content"
default — this puts authoring power in student hands.

### 13.3 Teacher Dashboard — 10-round expansion

10 deploys, ~1,200 net lines added to `teacher_module.js` (3001 → 4222).

**Round 0 — Visibility fixes** (`01fa5f38`):
- `generateResourceHTML` extended with full renderers for note-taking (all 3
  templates) and anchor-chart (sections + bullets + critique annotations).
  Closes a multi-month bug where student work in those tools was invisible
  to teachers reviewing the dashboard.
- **Notebook Activity tile** + **📓 badge** + CSV columns + Research PDF row

**Round 1 — Deterministic Quality Signals** (`c92275b9`):
6 research-thresholded class-wide signals, color-coded green/amber/red:
Cornell summary fill rate (Pauk/Kiewra ≥20 words), cue density (≥5),
Lab CER reasoning length (McNeill & Krajcik ≥30 words), Reading Response
evidence rate (≥70%), Connection variety (Keene & Zimmermann ≥50% using 2+
types), Self-assessment use (Hattie ≥50% using AI feedback).

**Round 2 — Mobile responsiveness** (`6cb6294b`):
Header / tab bar / detail header / 5-tile grid tightened for phone.

**Round 3 — Bulk teacher actions** (`17ef197e`):
4 actions on currently-filtered student set: mark all graded, clear graded,
**export notebooks PDF** (cut-apart classroom set or IEP packet), **AI
feedback sheets** (AI generates one short hand-back per student in 30 sec).

**Round 4 — Private teacher comment threads** (`c1850937`):
Per-student-per-resource teacher annotations, stored in localStorage (never
synced to student or cloud), threaded with timestamps. **💬 indicator**
in student-list row. Use cases: IEP team prep, parent conference, longitudinal
pattern tracking.

**Round 5 — Cross-tool misconception detection** (`7f455888`):
Note-taking field gaps (≥40% missing), sentence-frames response gaps (≥30%
blank), concept-sort per-item misplacement patterns (≥3× AND ≥20%).

**Round A — Quick wins** (`cf3a38fb`): bulk PDF includes teacher comments,
mobile bulk-actions toolbar.

**Round B — Concept-sort misconception pipeline** (`ed7a6cd1`): end-to-end
data capture in ConceptSortGame → submission JSON → dashboard aggregation.

**Round C — Behavior + STEM Stations tabs mobile** (`780d54fb`).

**Round D — TEACHER_METRIC_REGISTRY** (`b62f831f`, `494ed89b`, `e814834e`):
Single source of truth for per-tool dashboard metrics. Each entry can
declare `count(s)`, `qualitySignals(dd)`, `misconceptions(dd)`. 17 built-in
tools registered. Published on `window.AlloModules.TeacherMetricRegistry`
so external CDN modules can self-register via `.push()`. Drives the
AllToolActivityPanel, CSV columns, Class Quality Signals card grid, and
Cross-Tool Pattern Detection section uniformly.

### 13.4 Note-taking AI feedback + longitudinal Insights (`995b61cb`)

**Per-instance feedback** — "💬 Get AI Feedback" button on each note-taking
template:
- Strengths-first (Hattie research)
- Soft source-alignment check
- XP: completion floor (3) + quality (0-15) + alignment (0-5) + first-time
  bonus (5) = 3-28 XP per request
- Rubric scores INTERNAL ONLY — student never sees a number

**Longitudinal "Note-Taking Insights"** — 📊 button on Notebook overlay:
AI scans saved history, returns 2-4 patterns + growth-focused suggestions.
NOT a grade, NOT XP-bearing. Requires 2+ saved entries.

**Class-wide AI Insights** (teacher-side): cross-roster patterns + mini-lesson
suggestions; doesn't name individuals unless flagging equity disparity.

### 13.5 Tool Catalog single source of truth (`f1b9e381` + follow-ups)

New `tool_catalog_source.jsx` + `tool_catalog_module.js`. 20 tools
registered. Powers AlloBot autofill prompt (`phase_k_helpers_source.jsx`)
and blueprint-modify prompt (`modifyBlueprintWithAI` in AlloFlowANTI.txt).

**Bug closed:** note-taking + anchor-chart were silently absent from BOTH
AlloBot prompts for their entire existence. Plus 5 other tools (math,
lesson-plan, dbq, persona, gemini-bridge, alignment-report) were missing
from one or the other.

New `_check_tool_catalog.cjs` validates dispatcher/catalog sync, sidebar
key resolution, and entry sanity.

### 13.6 i18n localization pass (`f1b9e381`, multiple)

**Pass 1 — t() fallback fix + 32 missing keys** (32 keys):
6-month-old bug — `t()` returned the key string itself when missing, so
`t('key') || 'fallback'` was dead. Fixed: returns `undefined` (fallbacks
work) + `console.warn` on localhost.

**Pass 2 — Raw English wrapping** (615 strings across 17 source files):
17 `*_source.jsx` files audited for hardcoded English, wrapped in t() form.

**Net:** 675 new translation keys (ui_strings.js 8714 → 9539 lines).

### 13.7 Help-mode coverage expansion (`81df5d65`, `124788f5`, `f4aae336`)

**Three rounds:**
- Pass 1 — 27 missing entries for new tools (note-taking, anchor-chart, DBQ,
  header items, immersive reader overlays, etc.)
- Pass 2 — **107 entries** for 14 previously help-mode-blind components
  (BridgeSendModal, AIBackendModal, EducatorHubModal, AnchorChartView, etc.)
- Pass 3 — Cleanup + audit regex fix: 20 truly-orphaned deleted, 5
  newly-discovered missing added. Audit regex was missing the compiled
  React.createElement object syntax — 156 false-alarm "dead" entries
  identified and resolved.

**Net:** help_strings.js 652 → 786 keys (+134).

### 13.8 Three new audit scripts installed in repo

| Script | What it does |
|---|---|
| `_audit_help_keys.cjs` | Finds key/string sync mismatches between code references and help_strings.js |
| `_audit_help_anchors.cjs` | Finds Panel/Modal/Card/View/Overlay components with zero data-help-key |
| `_check_tool_catalog.cjs` | Validates ToolCatalog sync against dispatcher + sidebar keys |

All exit non-zero on errors. Reports written to `a11y-audit/`.

### 13.9 Annotation Suite expansion (`a7088746`)

- **Stickers: 12** (was 4) — broader student/teacher emotion + acknowledgment palette
- **Freehand drawing tool** added as fourth annotation kind

### 13.10 Visual Organizers — teacher-armed interactive mode (`ad4b6afd`, `8d9e13df`)

All 10 graphic organizers (Frayer, Venn, KWL, Story Map, See/Think/Wonder,
T-Chart, Fishbone, Concept Map, Flow Chart, Structured Outline) gained:
teacher-armed interactive mode + auto-unarm on completion. New game variants:
Frayer Sort, See-Think-Wonder Sort, Story Map Sort.

### 13.11 Comprehensive WCAG AA contrast audit + fix

5 deploys closing a vulnerability class across the entire app:

- `c6b303ca` — Stewardship tool per-view dark shells (original screenshot fix)
- `28ac691b` — STEM Lab host-level dark shell at `renderTool()`: single
  architectural fix covers **65 vulnerable tools** with `lightBackground: true`
  opt-out
- `7711be80` — SEL Hub host-level dark shell (same pattern): **69 of 70 tools**
- `5c0cbacc` — Optics Lab encyclopedia + STEM contrast pass
- `df347335` — Bulk text-contrast fix across **134 files** (659 replacements):
  Tailwind `text-{palette}-{200|300|400}` → `text-{palette}-{600|700}`;
  inline hex `color: '#94a3b8'` etc. → AA-passing equivalents. Safety
  constraints: only inside `className="..."` contexts (not CSS rule strings),
  only `color:` property, excludes print stylesheets + SVG fill/stroke.

**Final state:** ~270+ files now WCAG-compliant. ~391 long-tail findings
remain for per-instance review.

### 13.12 Updated totals

| Metric | Previous (May 14) | Current (May 17) | Delta |
|---|---|---|---|
| Documented user-facing features | ~570+ | **~720+** | +150 |
| STEM Lab tools | 95 | **104** | +9 |
| 20K+ MILESTONE curriculum tools | 0 | **8** | +8 |
| SEL Hub items | 34 | **70+ (with personalization Kit tools)** | substantial |
| Total source lines (approx) | ~656K | **~880K+** | +224K |
| Total i18n keys | 8,714 | **9,539** | +825 |
| Help strings | 652 | **786** | +134 |
| Teacher dashboard size | ~3,001 lines | **~4,222 lines** | +1,221 |
| Help-mode coverage gaps | 29 components blind | **0 priority** | full closure |
| WCAG AA contrast issues | ~938 text + 134 host gaps | **~391 long-tail only** | 70% closure |
| Total personalized student "Kit" tools | 0 | **~360+** | +360 |

### 13.13 Architectural patterns introduced or hardened

- **Host-level dark-shell wrap pattern** (STEM + SEL) — single change at
  `renderTool` funnel covers every tool's render output
- **Hub-and-spoke navigation** on mega-tools — category cards → filtered
  subnav → breadcrumb + search; eliminates 90-button-in-a-row problem
- **Personalized student "Kit" pattern** — student-facing default tab with
  their own scaffolds that persist across sessions
- **Single source of truth registries** (Tool Catalog + Teacher Metric
  Registry) — each replaces 5+ inline locations with one entry
- **Drift validators** — exit non-zero on errors, wired to surface regressions

---

**End of inventory.** Total documented features: **~720+** user-facing across
~165+ files (104 STEM Lab tools + 70+ SEL Hub items + 98 monolith CDN
modules + 1 annotation suite cross-cutting + expanded doc pipeline export
runtime + 10 rounds of teacher dashboard expansion + tool catalog single
source of truth + ~360 personalized student kit tools, with overlap).
