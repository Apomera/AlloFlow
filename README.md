<div align="center">
  <img src="./rainbow-book.jpg" alt="AlloFlow Logo" width="150"/>

  # AlloFlow (v1.1)
  **Adaptive Levels, Layers, & Outputs ➔ Flexible Learning Options for Whole-Student Education**

  [![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
  [![Local-First Architecture](https://img.shields.io/badge/Architecture-Local--First-brightgreen.svg)](#-local-first-desktop-and-school-box)
  [![Privacy: FERPA-aligned deployment](https://img.shields.io/badge/Privacy-FERPA--aligned_deployment-red.svg)](#-privacy--ferpa-aligned-deployment)
  [![Accessibility: WCAG 2.1 AA-oriented](https://img.shields.io/badge/Accessibility-WCAG_2.1_AA--oriented-blue.svg)](#-accessibility)
  [![UDL Aligned](https://img.shields.io/badge/UDL-Aligned-purple.svg)](#-udl-alignment)
</div>

---

## 🚀 What is AlloFlow?

AlloFlow is an **open-source, privacy-first AI differentiation engine** built for educators, special education teams, and school psychologists. Use the keyless Google-managed Gemini Canvas path with no installation, or run AlloFlow Desktop for a local-first teacher-laptop workflow. AlloFlow can transform source material into interactive, differentiated learning resources.

**No AlloFlow software subscription. Local classroom flows can run without student accounts or required PII. Cloud-provider terms, data handling, and costs depend on the deployment you choose.**

**Official website:** [apomera.github.io/AlloFlow](https://apomera.github.io/AlloFlow/)

**Search identity:** AlloFlow is a free open-source AI classroom assistant for differentiated instruction, UDL, accessibility, AAC communication, STEM/SEL tools, RTI, and local-first school deployments.

**Current inventory (verified July 18, 2026):** the repository registry check reports 127 STEM tool registrations and 70 SEL tool registrations; the STEM directory contains 126 plugin files because one file registers an additional tool. The broader July 3 codebase review remains the dated source for architecture and size estimates. AlloFlow Desktop is the everyday local-first path, while the Docker School Box stack is optional server/appliance infrastructure. See [docs/codebase_review_2026-07-03.md](./docs/codebase_review_2026-07-03.md), [docs/code_size_inventory_2026-07-03.csv](./docs/code_size_inventory_2026-07-03.csv), [docs/competitive_positioning_review_2026-07-03.md](./docs/competitive_positioning_review_2026-07-03.md), and [desktop/README.md](./desktop/README.md).

🔗 **[Launch AlloFlow](https://apomera.github.io/AlloFlow/launch.html)**

---

## ⚡ Quick Start

1. **[Click to launch](https://apomera.github.io/AlloFlow/launch.html)** — opens the Gemini Canvas path (eligible Google account required; availability and school administrator settings apply)
2. **Paste your lesson text** into the Source Material box, or let the AI generate from a topic
3. **Click Fullpack** — leveled text, glossary, quizzes, and scaffolds generated in one click
4. **Start a Live Session** to push resources to student devices in real-time

> 💡 For local-first use on a teacher laptop, see [desktop/README.md](./desktop/README.md). For school-owned server/appliance experiments, see [School Box](#-local-first-desktop-and-school-box) below.
>
> 🏫 **District decision-maker?** See the 2-page [Admin Brief](./AdminBrief.md) — cost comparison, privacy/compliance, and pilot-path summary.

---

## Product tour

- [Promotion site](https://apomera.github.io/AlloFlow/) -- overview, deployment paths, and current evidence
- [Feature catalog](https://apomera.github.io/AlloFlow/features.html) -- documented capabilities organized around UDL
- [Student experience](https://apomera.github.io/AlloFlow/students.html) -- learner-facing tools and accessibility supports
- [District brief](https://apomera.github.io/AlloFlow/for-districts.html) -- planning, privacy, accessibility, and pilot considerations

> Screenshots change quickly as the interface evolves. Use the current promotion pages and launch flow for the latest maintained product tour.

---

## ✨ Key Features

### 🎓 For Teachers

| Feature | Description |
|---------|-------------|
| **Leveled Text & Scaffolds** | Instantly rewrite any source to K-12 plus higher-education/adult reading levels with bilingual side-by-side views, cloze passages, and scaffolded writing frames |
| **Fullpack Generation** | One click generates glossary, leveled reader, quiz, visual organizer, and lesson plan simultaneously |
| **Live Session (Classroom Sync)** | Push your screen to all student devices in real-time — Teacher Paced or Student Paced modes |
| **Group Differentiation** | Assign different resources to different student groups simultaneously during a live session |
| **Lesson Plan Builder** | Auto-synthesizes all generated resources into a scripted, standard-aligned lesson plan |
| **Standards Alignment** | Align to CCSS, NGSS, CASEL, or any state standard; AI audits its own output for compliance |
| **Smart Profiles** | Save configurations (e.g., "Grade 5 + ESL") for one-click switching across lessons |
| **Multimodal Input** | Source from text paste, URL, PDF/image OCR, audio/video transcription, or AI generation |
| **AlloStudio** | Born-accessible flyer/worksheet/digital-art studio with real text, explicit reading order, required alt/decorative image states, and provenance-aware process history |
| **Open Groove Studio** | Browser-based groovebox/composition studio for rhythm, synthesis, samples, notation concepts, and license-aware classroom music creation |
| **Cinematic Studio** | Agentic document → video generator: source-grounded storyboard JSON, captions + translation, and client-side rendering (WebCodecs / Remotion) — no render server required (Educator Hub → 🎬) |
| **Professional Development** | Community-authored PD modules with AI co-authoring, completion tracking, and certificates (Educator Hub → Community Catalog → Professional Development) |

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
| **PDF Accessibility Pipeline** | Upload any PDF → up to 10-auditor triangulated AI audit (user-configurable, with stakeholder-perspective variants: screen-reader user, disability-rights advocate, Section 508, Title II ADA, JAWS/NVDA tester, etc.) → statistical agreement analysis (ICC-like, Cronbach-like) → one-click WCAG remediation via Vision API + Tesseract.js OCR (Gemini Vision fallback) for scanned/encrypted PDFs → axe-core 4.10 verification → self-healing auto-fix loop with regression-revert + SEM-based plateau detection → **native tagged-PDF output** (real `/StructTreeRoot` via pdf-lib, font embedding per PDF/UA §7.21.4.1) → in-app structural checks plus optional independent **PDF/UA-1 (ISO 14289-1) validation** through the local veraPDF demo/QA workflow → preview/edit with themes, brand matching, and AI image tools → **PII redaction** (true text removal) and **fillable AcroForm worksheets** → export as accessible PDF, HTML, ePub3, DAISY, ODT, or audio |

---

## STEM Lab (122 Plugin Files / 123 Registered Tool IDs)

The STEM Lab is a dynamically-loaded suite of browser-based interactive tools. As verified by `node dev-tools/check_tool_registry.cjs` on July 18, 2026, the workspace contains **126 `stem_tool_*.js` files** and **127 registered STEM tool IDs** because one plugin file registers an additional tool.

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

The SEL Hub provides **70 social-emotional learning tools** aligned with CASEL's core competencies and expanded AlloFlow categories such as self-direction, inner work, care of self, and stewardship:

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
# Clone the repository
git clone https://github.com/apomera/AlloFlow.git

# Start the optional Docker server stack
docker-compose up -d
```

**What can run locally:**
- **AlloFlow Desktop** — bundled app hosting, local keys, diagnostics, built-in local engine, local ASR/TTS settings, and Desktop LAN sessions
- **Optional Docker School Box stack** — server/appliance services such as PocketBase, Ollama, Piper, SearXNG, Flux, and Nginx when a school wants managed local infrastructure
- **LM Studio / Ollama / LocalAI** — compatibility paths for users who already run those local providers
- **PocketBase** — local database replacing Firebase

Hardware needs depend on the local model and service profile. See [desktop/README.md](./desktop/README.md), [docker/README.md](./docker/README.md), and [DEPLOY_YOUR_OWN.md](./DEPLOY_YOUR_OWN.md).

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
- **Keyboard-first coverage** — core navigation and audited workflows support standard keyboard interaction; use the published audit and report any tool-specific gaps

---

## 💵 Is It Really Free?

**The software:** yes — free and open-source under AGPL v3. **The Gemini API usage** depends on your deployment path:

| Path | Software cost | API cost | What You Need |
|------|---|---|---|
| **Gemini Canvas** | No AlloFlow license fee | Subject to Google's current terms and quotas | A Google account; uses the host-provided keyless path |
| **Firebase Hosting (Spark — free tier)** | No AlloFlow license fee | Hosting and AI-provider usage are subject to current free-tier limits | A Firebase project plus a securely configured AI-provider path |
| **Firebase Hosting (Blaze — pay-as-you-go)** | No AlloFlow license fee | Provider and hosting charges vary by usage | Relevant for heavier workflows; see [DEPLOY_YOUR_OWN.md](./DEPLOY_YOUR_OWN.md) and verify current provider pricing |
| **AlloFlow Desktop** | Free | $0 for local engine use; cloud providers optional | Teacher laptop/workstation; no Docker required |
| **School Box Server (optional Docker)** | Hardware cost only | $0 for local model paths; cloud providers optional | School-owned server/appliance stack |

---

## 🎯 UDL Alignment

Every feature maps to [CAST's UDL Guidelines](https://udlguidelines.cast.org/):

| UDL Principle | AlloFlow Tools |
|---------------|----------------|
| **Engagement** | Adventure Mode, Boss Battle, Escape Room, Democracy Mode, Symbol Quest, Symbol Search, StoryForge, Growth Mindset Workshop, Gamification Engine |
| **Representation** | Leveled Text, Bilingual Views, Glossary with Icons, STEM Lab (126 plugin files / 127 registered IDs), SEL Hub (70 tools), TTS (40+ languages), Color Overlays, Bionic Reading, Symbol Studio AAC boards |
| **Action & Expression** | Writing Scaffolds, StoryForge, Auto-Grader, Rubrics, Oral Fluency Coach, Dictation, QTI Export, Symbol Studio, Report Writer, PDF Pipeline |

---

## 📚 Documentation

| Resource | Link |
|----------|------|
| 🏫 Admin Brief (for districts) | [AdminBrief.md](./AdminBrief.md) |
| ♿ Interim Accessibility Conformance Report (VPAT® 2.5Rev WCAG) | [VPAT-2.5-WCAG-AlloFlow.md](./VPAT-2.5-WCAG-AlloFlow.md) |
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

AlloFlow uses a **Hub-and-Spoke architecture** — a single orchestrator component (`App.jsx` / `AlloFlowANTI.txt`, ~31K lines in the current deploy copy) dynamically loads a large set of modules and plugin families on demand: STEM Lab (126 plugin files / 127 registered IDs), SEL Hub (70 tools), BehaviorLens, Report Writer, Symbol Studio, Word Sounds, Student Analytics, StoryForge, Cinematic Studio (doc→video), AlloStudio, Open Groove Studio, Professional Development, Doc Pipeline, Games, AI Backend, and more. Modules are served from the selected deployment's static asset host; `build.js` handles URL resolution. See [CONTRIBUTING.md](./CONTRIBUTING.md) for architecture rules and [architecture.md](./architecture.md) for a full technical overview.

```bash
# Cloud deployment (Firebase)
cd desktop/web-app
npm install
npm run build
firebase deploy

# Desktop local runtime
npm.cmd run desktop:check
npm.cmd run desktop:smoke
npm.cmd run desktop

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

1. Read [CONTRIBUTING.md](./CONTRIBUTING.md) for architecture rules (Hub-and-Spoke pattern, Cloudflare CDN module resolution, plugin templates).
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

**AGPL v3** — free and open source under a strong copyleft license, supporting educational technology as a public good.

© 2026 Aaron Pomeranz, PsyD

<p align="center">
  <strong>Built by a school psychologist, for educators.</strong><br>
  <em>"Differentiation should be the default, not the exception."</em>
</p>
