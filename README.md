<div align="center">
  <img src="./rainbow-book.jpg" alt="AlloFlow Logo" width="150"/>

  # AlloFlow (v1.1)
  **Adaptive Levels, Layers, & Outputs ➔ Flexible Learning Options for Whole-Student Education**

  [![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
  [![Local-First Architecture](https://img.shields.io/badge/Architecture-Local--First-brightgreen.svg)](#-local-first-the-school-box)
  [![Privacy: FERPA & COPPA](https://img.shields.io/badge/Privacy-FERPA_Compatible-red.svg)](#-privacy--ferpa-compliance)
  [![Accessibility: WCAG 2.1 AA](https://img.shields.io/badge/Accessibility-WCAG_2.1_AA-blue.svg)](#-accessibility)
  [![UDL Aligned](https://img.shields.io/badge/UDL-Aligned-purple.svg)](#-udl-alignment)
</div>

---

## 🚀 What is AlloFlow?

AlloFlow is an **open-source, privacy-first AI differentiation engine** built for educators, special education teams, and school psychologists. It runs inside Google Gemini Canvas — **no install required** — and instantly transforms any source material into a full suite of interactive, gamified, and accessible learning resources.

**No subscriptions. No student accounts. No PII collected.**

🔗 **[Launch AlloFlow](https://gemini.google.com/share/c8baf80a46cc)**

---

## ⚡ Quick Start

1. **[Click to launch](https://gemini.google.com/share/c8baf80a46cc)** — opens directly in Gemini Canvas (free Google account required)
2. **Paste your lesson text** into the Source Material box, or let the AI generate from a topic
3. **Click Fullpack** — leveled text, glossary, quizzes, and scaffolds generated in one click
4. **Start a Live Session** to push resources to student devices in real-time

> 💡 For self-hosted deployment on district hardware, see [School Box](#-local-first-the-school-box) below.
>
> 🏫 **District decision-maker?** See the 2-page [Admin Brief](./AdminBrief.md) — cost comparison, privacy/compliance, and pilot-path summary.

---

## 📸 Screenshots

| Main Interface | Live Session | STEM Lab |
|:-:|:-:|:-:|
| ![Main interface showing source text input and generated leveled reading](docs/screenshots/main-interface.png) | ![Live Session mode with Boss Battle active on student devices](docs/screenshots/live-session.png) | ![STEM Lab grid showing 65 interactive simulation tiles](docs/screenshots/stem-lab.png) |

| Adventure Mode | BehaviorLens | Word Sounds |
|:-:|:-:|:-:|
| ![Adventure Mode RPG scene with inventory and dice](docs/screenshots/adventure-mode.png) | ![BehaviorLens ABC data collection form](docs/screenshots/behavior-lens.png) | ![Word Sounds phonemic awareness activity with Elkonin boxes](docs/screenshots/word-sounds.png) |

> To contribute screenshots, place PNGs in `docs/screenshots/` matching the filenames above and open a PR. You can capture them from the [live Canvas deployment](https://gemini.google.com/share/c8baf80a46cc).

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
| **PDF Accessibility Pipeline** | Upload any PDF → 5-auditor triangulated AI audit with statistical analysis (ICC, Cronbach's alpha) → one-click WCAG remediation via Vision API → axe-core verification → self-healing auto-fix loop → preview/edit with themes, brand matching, and AI image tools → export as accessible PDF, HTML, or audio |

---

## 🧮 STEM Lab (65 Interactive Simulations)

The STEM Lab is a dynamically-loaded suite of **65 browser-based interactive tools** spanning:

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

## 💚 SEL Hub (24 Interactive Tools)

The SEL Hub provides **24 social-emotional learning tools** aligned with CASEL's 5 core competencies:

| Competency | Tools |
|------------|-------|
| **Self-Awareness** | Emotions Explorer, Strengths Inventory, Journal, Zones of Regulation, Growth Mindset Workshop |
| **Self-Management** | Coping Strategies, Goals & Planning, Mindfulness, Transitions |
| **Social Awareness** | Perspective Taking, Compassion, Culture Explorer, Upstander Training |
| **Relationship Skills** | Friendship Builder, Conflict Resolution, Community, Teamwork, Restorative Circle |
| **Responsible Decision-Making** | Decisions Lab, Ethical Reasoning Lab, Civic Action & Hope, Safety, Social Skills, Advocacy |

Highlights include the **Growth Mindset Workshop** (Brain Science, Reframe Engine, Famous Yet Stories, AI Growth Coach, Letter to Future Me), **Restorative Circle** (5 circle types with Indigenous roots and talking pieces), **Ethical Reasoning Lab** (6 contemporary dilemmas, 6 ethical frameworks, stakeholder mapping), and **Culture Explorer** (80+ world cultures with AI-powered deep dives).

---

## 🔐 Privacy & FERPA Compliance

**No student data leaves your school.**

| Principle | Implementation |
|-----------|----------------|
| **Zero PII Required** | The tool never requires names, IDs, or identifying information |
| **On-Device Storage** | All student data persists in the browser's local storage — never written to cloud databases |
| **TeacherGate** | Clinical tools, grading rubrics, and answer keys are isolated behind educator verification |
| **Dual-Engine Offline TTS** | Both Kokoro (English) and Piper (40+ languages) run entirely inside the browser — audio never hits cloud APIs |
| **Air-Gap Option** | School Box deployment physically disconnects from all external APIs |

> For districts using **Google Workspace for Education**: Firebase Hosting (the cloud deployment path) uses only static file delivery — no student data is written to Google's servers. Your existing Google Workspace agreement covers this.

---

## 🏫 Local-First: The "School Box"

> **Status: In Development.** The School Box air-gapped deployment is being actively developed in collaboration with **[Tyler Despain of Physher](https://physher.com)**. The architecture is designed and the Docker configuration exists, but the full local stack is not yet operational. The Firebase Hosting cloud deployment (see [DEPLOY_YOUR_OWN.md](./DEPLOY_YOUR_OWN.md)) is the current production path.

For districts that need **complete data sovereignty and zero ongoing API costs**, AlloFlow is designed to run entirely on local intranet hardware via Docker.

```bash
# Clone the repository
git clone https://github.com/apomera/AlloFlow.git

# Start all services (Ollama LLM + TTS + local database + search)
docker-compose up -d

# Access at http://localhost:3000
```

**What will run locally:**
- **Ollama** — LLM inference (Llama 3.1, Phi-3.5) on your own GPU
- **PocketBase** — local database replacing Firebase
- **Piper / Edge TTS** — offline text-to-speech
- **SearXNG** — local web search for fact verification
- **Nginx** — reverse proxy and SSL

Recommended hardware: 32GB RAM + NVIDIA RTX 3090/4090. See [DEPLOY_YOUR_OWN.md](./DEPLOY_YOUR_OWN.md) for the full Firebase cloud deployment guide.

---

## ♿ Accessibility

AlloFlow is **WCAG 2.1 AA compliant**. All interactive elements — including games — are fully operable without a mouse.

- **Dyslexia Fonts** — OpenDyslexic, Lexend, Atkinson Hyperlegible
- **Bionic Reading** — bolds initial letters to guide decoding
- **Offline TTS** — word-for-word tracking in 40+ languages (Kokoro + Piper)
- **Color Overlays** — Peach, Blue, Yellow tints for Irlen syndrome support
- **Reading Ruler** — mouse-following line isolation bar
- **High Contrast & Dark Mode**
- **Voice Dictation** — speech-to-text on all input fields
- **Full Keyboard Navigation** — every game and tool accessible via Tab/Enter/Arrow keys

---

## 💵 Is It Really Free?

**Yes.** AlloFlow is free and open-source under AGPL v3.

| Path | Cost | What You Need |
|------|------|---------------|
| **Gemini Canvas** | Free | A Google account (uses your free daily Gemini quota) |
| **Firebase Hosting** | Free tier available | A Firebase project; see [DEPLOY_YOUR_OWN.md](./DEPLOY_YOUR_OWN.md) |
| **School Box (Docker)** | Hardware cost only | Local server; no recurring API fees ever |

---

## 🎯 UDL Alignment

Every feature maps to [CAST's UDL Guidelines](https://udlguidelines.cast.org/):

| UDL Principle | AlloFlow Tools |
|---------------|----------------|
| **Engagement** | Adventure Mode, Boss Battle, Escape Room, Democracy Mode, Symbol Quest, Symbol Search, StoryForge, Growth Mindset Workshop, Gamification Engine |
| **Representation** | Leveled Text, Bilingual Views, Glossary with Icons, STEM Lab (65 tools), SEL Hub (24 tools), TTS (40+ languages), Color Overlays, Bionic Reading, Symbol Studio AAC boards |
| **Action & Expression** | Writing Scaffolds, StoryForge, Auto-Grader, Rubrics, Oral Fluency Coach, Dictation, QTI Export, Symbol Studio, Report Writer, PDF Pipeline |

---

## 📚 Documentation

| Resource | Link |
|----------|------|
| 🏫 Admin Brief (for districts) | [AdminBrief.md](./AdminBrief.md) |
| ♿ VPAT 2.5 (accessibility conformance) | [VPAT-2.5-WCAG-AlloFlow.md](./VPAT-2.5-WCAG-AlloFlow.md) |
| ♿ WCAG AA Audit Report | [alloflow_wcag_aa_audit_report.md](./alloflow_wcag_aa_audit_report.md) |
| 📖 Complete User Manual | [AlloFlow Complete User Manual.md](./AlloFlow%20Complete%20User%20Manual.md) |
| 🖨️ Quick Reference Cards | [QuickReferenceCards.md](./QuickReferenceCards.md) |
| 🏗️ Architecture Overview | [architecture.md](./architecture.md) |
| 🚀 Firebase Deployment | [DEPLOY_YOUR_OWN.md](./DEPLOY_YOUR_OWN.md) |
| 🔒 Security Policy | [SECURITY.md](./SECURITY.md) |
| 🤝 Contributing | [CONTRIBUTING.md](./CONTRIBUTING.md) |
| 🐛 Report Issues | [GitHub Issues](https://github.com/Apomera/AlloFlow/issues) |

---

## 🔧 For Developers

AlloFlow uses a **Hub-and-Spoke architecture** — a single orchestrator component (`App.jsx`, ~55K lines) dynamically loads spoke modules on demand: STEM Lab (65 tools), SEL Hub (24 tools), BehaviorLens, Report Writer, Symbol Studio, Word Sounds, Student Analytics, StoryForge, Games, Doc Pipeline, AI Backend, and more. See [CONTRIBUTING.md](./CONTRIBUTING.md) for architecture rules and [architecture.md](./architecture.md) for a full technical overview.

```bash
# Cloud deployment (Firebase)
cd prismflow-deploy
npm install
npm run build
firebase deploy

# Run clinical logic test suite (no dependencies)
node tests/clinical_tests.js
```

### 🧪 Test Suite

AlloFlow includes **117 automated tests** covering clinical decision-making logic — the scoring algorithms, classification lookups, and data transformations that affect real student services. Tests are organized in three tiers:

- **Tier 1 (Clinical Decisions):** Score classification (standard + T-score), percentile calculation, PII scrubbing, RTI tier classification, developmental norms
- **Tier 2 (Learning Tracking):** Familiarity scoring, word growth levels, codename validation, Pearson correlation, aimline monitoring
- **Tier 3 (Data Quality):** Math fluency benchmarks, error analysis, doc pipeline issue normalization, assessment preset integrity

Run with `node tests/clinical_tests.js` — zero dependencies, just Node.js. See [tests/README.md](./tests/README.md) for full documentation.

---

## 🤝 Contributing

Contributions are welcome — especially new STEM/SEL tools, accessibility improvements, clinical test cases, and additional language support.

1. Read [CONTRIBUTING.md](./CONTRIBUTING.md) for architecture rules (Hub-and-Spoke pattern, CDN hash pinning, plugin templates).
2. Read [architecture.md](./architecture.md) for a full technical overview.
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

**AGPL v3** — free and open source forever, ensuring educational technology remains a public good.

© 2026 Aaron Pomeranz, PsyD

<p align="center">
  <strong>Built by a school psychologist, for educators.</strong><br>
  <em>"Differentiation should be the default, not the exception."</em>
</p>
