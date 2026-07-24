<div align="center">
  <img src="./rainbow-book.jpg" alt="AlloFlow Logo" width="150"/>

  # AlloFlow (v1.1)
  **Adaptive Levels, Layers, & Outputs ➔ Flexible Learning Options for Whole-Student Education**

  [![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
  [![Local-First Architecture](https://img.shields.io/badge/Architecture-Local--First-brightgreen.svg)](#-local-first-desktop-and-school-box)
  [![Privacy: FERPA & COPPA](https://img.shields.io/badge/Privacy-FERPA_Compatible-red.svg)](#-privacy--ferpa-compliance)
  [![Accessibility: WCAG 2.1 AA](https://img.shields.io/badge/Accessibility-WCAG_2.1_AA-blue.svg)](#-accessibility)
  [![UDL Aligned](https://img.shields.io/badge/UDL-Aligned-purple.svg)](#-udl-alignment)
</div>

---

> **Repository role:** This directory is the reusable web build shell for AlloFlow Desktop and opt-in district Firebase hosting. It is not tied to a maintainer demo project; `.firebaserc` intentionally defaults to `YOUR_PROJECT_ID`.

## 🚀 What is AlloFlow?

AlloFlow is an **open-source, privacy-first AI differentiation engine** built for educators, special education teams, and school psychologists. It runs inside Google Gemini Canvas — **no install required** — and instantly transforms any source material into a full suite of interactive, gamified, and accessible learning resources.

**No AlloFlow license fee. Student accounts and PII are not required by default; data flows depend on the features, provider, and deployment selected.**

🔗 **[Launch AlloFlow](https://apomera.github.io/AlloFlow/launch.html)**

---

## ⚡ Quick Start

1. **[Click to launch](https://apomera.github.io/AlloFlow/launch.html)** — opens directly in Gemini Canvas (free Google account required)
2. **Paste your lesson text** into the Source Material box, or let the AI generate from a topic
3. **Click Fullpack** — leveled text, glossary, quizzes, and scaffolds generated in one click
4. **Start a Live Session** to push resources to student devices in real-time

> 💡 For local-first use on a teacher laptop, see [desktop/README.md](../../desktop/README.md). For school-owned server/appliance experiments, see [School Box](#-local-first-desktop-and-school-box) below.

---

## ✨ Key Features

### 🎓 For Teachers

| Feature | Description |
|---------|-------------|
| **Leveled Text & Scaffolds** | Instantly rewrite any source to K–Graduate reading level with bilingual side-by-side views, cloze passages, and scaffolded writing frames |
| **Fullpack Generation** | One click generates glossary, leveled reader, quiz, visual organizer, and lesson plan simultaneously |
| **Live Session (Classroom Sync)** | Push your screen to all student devices in real-time — Teacher Paced or Student Paced modes |
| **Group Differentiation** | Assign different resources to different student groups simultaneously during a live session |
| **Lesson Plan Builder** | Auto-synthesizes all generated resources into a scripted, standard-aligned lesson plan |
| **Standards Alignment** | Align to CCSS, NGSS, CASEL, or any state standard; AI audits its own output for compliance |
| **Smart Profiles** | Save configurations (e.g., "Grade 5 + ESL") for one-click switching across lessons |
| **Multimodal Input** | Source from text paste, URL, PDF/image OCR, audio/video transcription, or AI generation |

### 🎮 For Students

| Feature | Description |
|---------|-------------|
| **Adventure Mode** | Choose-your-own-adventure RPG with XP, inventory, dynamic Imagen-generated scenes, and Storybook export |
| **Boss Battle** | Whole-class cooperative quiz game — correct answers deal damage to the boss |
| **Escape Room** | Team-based puzzle challenges with teacher-controlled hints and timed escape tracking |
| **Review Game** | Jeopardy-style competitive review with teams and real-time scoring |
| **Democracy Mode** | Class votes on the answer; majority response is submitted |
| **Gamification Engine** | XP, levels, streaks, and badges earned across all activities |
| **Interactive Glossary** | Memory Match, Word Search, Crossword, Bingo, Scramble — all generated instantly from the vocabulary list |
| **Immersive Reader** | RSVP speed reader, karaoke highlighting, bionic reading, and adjustable reading ruler |

### 🩺 For Special Educators & BCBAs

| Feature | Description |
|---------|-------------|
| **BehaviorLens** | Full FBA/BIP suite — ABC data collection, frequency/interval tracking, IOA calculator (5 methods), scatterplot analysis, preference assessments (MSWO, Paired, Free Operant) |
| **Quick-Fill AI** | Type a natural language observation; AI auto-structures it into Antecedent, Behavior, Consequence with function hypothesis |
| **Intervention Templates** | DRO protocols, token economies, behavior contracts, SMART goals, FCT templates, de-escalation toolkit |
| **Restorative Language** | Affirmative Glossary translates clinical ABA terms to person-first language throughout; Restorative Questions generated from each logged incident |
| **Symbol Studio** | Full AAC platform — AI-generated PCS-style symbols (Imagen + image-to-image), board builder, visual schedules, social stories (Carol Gray format), 8 Quick Board types, Symbol Quest (4 game modes), Symbol Search (auditory-to-visual training), Word Garden (vocabulary growth tracking), IEP goal tracking with auto-recorded trials, partner-assisted scanning, multilingual boards (14 languages), per-cell parent voice recording, up to 8 student profiles |
| **Word Sounds Studio** | 8 phonemic awareness activity types (segmentation, blending, isolation, rhyming, mapping, spelling, word families) with grade-normed adaptive difficulty and 6 achievement badges |
| **StoryForge** | 6-phase scaffolded creative writing with AI illustration (Imagen), narration (8 TTS voices), grading with custom rubrics, 18-language support, writing sprint timers, AI grammar/style coaching, revision tracking, and comic panel stickers |

### 🧠 For School Psychologists

| Feature | Description |
|---------|-------------|
| **Report Writer Wizard** | 10-step guided wizard for synthesizing standardized assessment data into bilingual psychoeducational reports with triangulated generation (N parallel passes, best-of-N by evidence coverage), self-healing dual-pass accuracy audit, score-text verification, and cross-section consistency checking |
| **Fact-Chunk Pipeline** | Immutable PII-scrubbing layer prevents AI hallucination or statistical misinterpretation during report generation; developmental norms cross-referencing (attention span, tantrum frequency, social play, vocabulary by age) |
| **17 Assessment Presets** | WISC-V, WIAT-4, BASC-3 (Parent & Teacher), Vineland-3, BRIEF-2, Conners-4, WJ-IV COG & ACH, KABC-II, DAS-II, CELF-5, KTEA-3, SRS-2, GARS-3, BOT-2 |
| **Student Analytics (RTI)** | Automated Tier 1/2/3 classification with aimline monitoring (4-week warning, 6-week critical alerts); ORF, Math Fluency, and Literacy CBM probes; Pearson correlation analysis; anomaly flagging; CSV export |
| **Math Fluency Probes** | K–8 grade-normed DCPM arithmetic drills (addition, subtraction, multiplication, division) with error analysis and frustration detection |
| **PDF Accessibility Pipeline** | Upload any PDF → multi-auditor AI audit → one-click WCAG remediation via Vision API + OCR fallbacks → axe-core verification → self-healing auto-fix loop → native tagged-PDF output with in-app structural checks and optional veraPDF/PAC-style QA → preview/edit with themes, brand matching, and AI image tools → export as accessible PDF, HTML, or audio |

---

## 🧮 STEM Lab (122 Tool Files / 123 Registered Plugin IDs)

The STEM Lab is a dynamically-loaded suite of browser-based interactive tools. As of July 18, 2026, the workspace contains **122 `stem_tool_*.js` files** and **123 unique registered plugin IDs** because a few tools preserve aliases or paired tool IDs.

| Domain | Tools |
|--------|-------|
| **Math Fundamentals** | Fraction Lab, Area Model, Multiplication Table, Number Line, Math Manipulatives, Money Math, Coordinate Grid, Angle Explorer, 3D Volume Explorer, 3D Geometry Sandbox |
| **Advanced Math** | Function Grapher, Inequality Grapher, Calculus Visualizer, Algebra CAS, Graphing Calculator, Probability Explorer, Unit Converter, Logic Lab |
| **Life Science & Biology** | Cell Simulator, Human Anatomy, Brain Atlas, DNA Lab, Punnett Square, Virtual Dissection, Decomposer, Companion Planting Lab, Aquaculture & Ocean Lab, Ecosystem Simulator, Beehive Simulator |
| **Earth & Space Science** | Rocks & Minerals, Water Cycle, Climate Explorer, Plate Tectonics, Solar System, Universe Timelapse, Galaxy Explorer, Moon Mission |
| **Physics & Chemistry** | Wave Simulator, Physics Simulator, Circuit Builder, Chemical Equation Balancer, Molecule Builder, Titration Lab, Semiconductor Lab, Data Plotter |
| **Technology & CS** | Coding Playground, Cyber Defense Lab, Data Studio |
| **Creative & Design** | Architecture Studio, Art & Design Studio, Art Studio, Creative Studio, Game Studio |
| **Social Studies & Life** | Economics Lab, Life Skills Lab |
| **Simulation & Applied** | Kepler Colony, Behavior Shaping Lab, Flight Simulator, ATC Tower, Fire Ecology, Epidemic Simulator, World Builder, Science Lab, Geometry World |

Each tool supports **Generate Drill** for instant related practice sets and saves/restores state with the session.

---

## 💚 SEL Hub (70 Interactive Tools)

The SEL Hub provides **70 social-emotional learning tools** aligned with CASEL's 5 core competencies:

| Competency | Tools |
|------------|-------|
| **Self-Awareness** | Emotions Explorer, Strengths Inventory, Journal, Zones of Regulation, Growth Mindset Workshop |
| **Self-Management** | Coping Strategies, Goals & Planning, Mindfulness, Transitions |
| **Social Awareness** | Perspective Taking, Compassion, Culture Explorer, Upstander Training |
| **Relationship Skills** | Friendship Builder, Conflict Resolution, Community, Teamwork, Restorative Circle |
| **Responsible Decision-Making** | Decisions Lab, Ethical Reasoning Lab, Civic Action & Hope, Safety, Social Skills, Advocacy |

Highlights include the **Growth Mindset Workshop** (Brain Science, Reframe Engine, Famous Yet Stories, AI Growth Coach, Letter to Future Me), **Restorative Circle** (5 circle types with Indigenous roots and talking pieces), **Ethical Reasoning Lab** (6 contemporary dilemmas, 6 ethical frameworks, stakeholder mapping), and **Culture Explorer** (80+ world cultures with AI-powered deep dives).

---

## 🔐 Privacy & FERPA-Aligned Deployment

AlloFlow is designed so schools can keep student data inside the browser, teacher device, or school-controlled infrastructure. Cloud use is explicit and deployment-dependent.

| Principle | Implementation |
|-----------|----------------|
| **No PII Required** | The tool does not require names, IDs, or identifying information |
| **On-Device Storage** | Most ordinary work persists in browser local storage or downloaded project files; live-session cloud paths are designed to avoid durable student records |
| **TeacherGate** | Clinical tools, grading rubrics, and answer keys are isolated behind educator verification |
| **Local Voice/ASR Options** | Desktop can run local voice and transcription paths; web deployments can fall back to browser/local options when available |
| **Local-First Options** | AlloFlow Desktop supports no-Docker local use and same-room LAN sessions; the Docker School Box stack is optional server/appliance infrastructure |

> For districts using **Google Workspace for Education**: Canvas/Firebase coverage and student-privacy obligations depend on the district's account, contracts, retention settings, and actual use. AlloFlow is built to support FERPA-aligned deployments, but final compliance is a district/legal determination.

---

## 🏫 Local-First: Desktop and School Box

> **Status as of July 9, 2026:** AlloFlow Desktop is the recommended local-first path for a teacher laptop or personal workstation. It serves the bundled app locally, manages keys and local AI settings, supports the built-in local engine, and can run same-room Desktop LAN sessions without Docker. The Docker School Box stack remains an optional server/appliance path for school-owned boxes, district/server experiments, and heavier air-gapped infrastructure.

For everyday local use:

```powershell
npm.cmd run desktop:check
npm.cmd run desktop:smoke
npm.cmd run desktop
```

For optional School Box server/appliance testing:

```bash
docker compose up -d
```

**What can run locally:**
- **AlloFlow Desktop** — bundled app hosting, local keys, diagnostics, built-in local engine, local ASR/TTS settings, and Desktop LAN sessions
- **Optional Docker School Box stack** — server/appliance services such as PocketBase, Ollama, Piper, SearXNG, Flux, and Nginx when a school wants managed local infrastructure
- **LM Studio / Ollama / LocalAI** — compatibility paths for users who already run those local providers
- **PocketBase** — local database replacing Firebase

Hardware needs depend on the local model and service profile. See [desktop/README.md](../../desktop/README.md), [docker/README.md](../../docker/README.md), and [DEPLOY_YOUR_OWN.md](../../DEPLOY_YOUR_OWN.md).

---

## ♿ Accessibility

AlloFlow is built toward **WCAG 2.1 AA** with keyboard-first interaction patterns, automated audits, and per-tool accessibility gates. Compliance-sensitive deployments should still verify the exact workflow and exported artifacts they use.

- **Dyslexia Fonts** — OpenDyslexic, Lexend, Atkinson Hyperlegible
- **Bionic Reading** — bolds initial letters to guide decoding
- **Voice options** — word-for-word tracking through configured browser, cloud, Desktop, or optional local voice engines
- **Color Overlays** — Peach, Blue, Yellow tints for Irlen syndrome support
- **Reading Ruler** — mouse-following line isolation bar
- **High Contrast & Dark Mode**
- **Voice Dictation** — speech-to-text on all input fields
- **Keyboard support** — maintained interaction patterns and audits cover major workflows; verify the exact tools used with keyboard, screen reader, zoom, and contrast testing

---

## 💵 Is It Really Free?

**AlloFlow has no license fee** and is open-source under AGPL v3. Hosting, AI-provider, implementation, support, hardware, and specialist-review costs vary by configuration.

| Path | Cost | What You Need |
|------|------|---------------|
| **Gemini Canvas** | No AlloFlow license fee; Google terms and quotas apply | An eligible Google account and current feature availability |
| **Firebase Hosting** | Usage-based Google pricing and any applicable allowance | A district-controlled Firebase project; see [DEPLOY_YOUR_OWN.md](../../DEPLOY_YOUR_OWN.md) |
| **AlloFlow Desktop** | No AlloFlow license fee; local/provider costs may apply | Teacher laptop/workstation; no Docker required |
| **School Box Server (optional Docker)** | Hardware, operations, and any provider costs | School-owned server/appliance stack |

---

## 🎯 UDL Alignment

Every feature maps to [CAST's UDL Guidelines](https://udlguidelines.cast.org/):

| UDL Principle | AlloFlow Tools |
|---------------|----------------|
| **Engagement** | Adventure Mode, Boss Battle, Escape Room, Democracy Mode, Symbol Quest, Symbol Search, StoryForge, Growth Mindset Workshop, Gamification Engine |
| **Representation** | Leveled Text, Bilingual Views, Glossary with Icons, STEM Lab (122 tool files / 123 registered IDs), SEL Hub (70 tools), TTS (40+ languages), Color Overlays, Bionic Reading, Symbol Studio AAC boards |
| **Action & Expression** | Writing Scaffolds, StoryForge, Auto-Grader, Rubrics, Oral Fluency Coach, Dictation, QTI Export, Symbol Studio, Report Writer, PDF Pipeline |

---

## 📚 Documentation

| Resource | Link |
|----------|------|
| 📖 Complete User Manual | [AlloFlow Complete User Manual.md](../../AlloFlow%20Complete%20User%20Manual.md) |
| 🖨️ Quick Reference Cards | [QuickReferenceCards.md](../../QuickReferenceCards.md) |
| 🏗️ Architecture Overview | [architecture.md](../../architecture.md) |
| 🚀 Firebase Deployment | [DEPLOY_YOUR_OWN.md](../../DEPLOY_YOUR_OWN.md) |
| 🔒 Security Policy | [SECURITY.md](../../SECURITY.md) |
| 🤝 Contributing | [CONTRIBUTING.md](../../CONTRIBUTING.md) |
| 🐛 Report Issues | [GitHub Issues](https://github.com/Apomera/AlloFlow/issues) |

---

## 🔧 For Developers

AlloFlow uses a **Hub-and-Spoke architecture** — a single orchestrator component (`App.jsx` / `AlloFlowANTI.txt`) dynamically loads the top-level modules listed in `build.js` plus large plugin families on demand: STEM Lab (122 tool files / 123 registered IDs), SEL Hub (70 tools), BehaviorLens, Report Writer, Symbol Studio, Word Sounds, Student Analytics, StoryForge, Cinematic Studio (doc→video), Professional Development, Doc Pipeline, Games, AI Backend, and more. See [CONTRIBUTING.md](../../CONTRIBUTING.md) for architecture rules and [architecture.md](../../architecture.md) for a full technical overview.

```bash
# Cloud deployment (Firebase)
cd desktop/web-app
npm install
npm run build
firebase deploy --only hosting

# Run clinical logic test suite (no dependencies)
node tests/clinical_tests.js
```

### 🧪 Test Suite

AlloFlow includes **117 automated tests** covering clinical decision-making logic — the scoring algorithms, classification lookups, and data transformations that affect real student services. Tests are organized in three tiers:

- **Tier 1 (Clinical Decisions):** Score classification (standard + T-score), percentile calculation, PII scrubbing, RTI tier classification, developmental norms
- **Tier 2 (Learning Tracking):** Familiarity scoring, word growth levels, codename validation, Pearson correlation, aimline monitoring
- **Tier 3 (Data Quality):** Math fluency benchmarks, error analysis, doc pipeline issue normalization, assessment preset integrity

Run with `node tests/clinical_tests.js` — zero dependencies, just Node.js. See [tests/README.md](../../tests/README.md) for full documentation.

---

## 🤝 Contributing

Contributions are welcome — especially new STEM/SEL tools, accessibility improvements, clinical test cases, and additional language support.

1. Read [CONTRIBUTING.md](../../CONTRIBUTING.md) for architecture rules (Hub-and-Spoke pattern, CDN hash pinning, plugin templates).
2. Read [architecture.md](../../architecture.md) for a full technical overview.
3. Open a descriptive PR explaining which UDL checkpoint or clinical workflow your change enhances.

**Quick wins for new contributors:**
- Add a new STEM tool (`stem_lab/stem_tool_yourname.js`) — self-contained, no core file changes needed
- Add a new SEL tool (`sel_hub/sel_tool_yourname.js`) — same plugin pattern
- Add clinical test cases to `tests/clinical_tests.js` (verify expected values against assessment manuals)
- Improve i18n strings in `ui_strings.js` for an underrepresented language
- Add keyboard navigation to an existing game
- Fix an issue tagged `good first issue` on [GitHub Issues](https://github.com/Apomera/AlloFlow/issues)

---

## 📄 License & Credits

**AGPL v3** — free and open source under a strong copyleft license, supporting educational technology as a public good.

© 2026 Aaron Pomeranz, PsyD

<p align="center">
  <strong>Built by a school psychologist, for educators.</strong><br>
  <em>"Differentiation should be the default, not the exception."</em>
</p>
