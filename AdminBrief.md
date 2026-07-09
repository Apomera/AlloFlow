# AlloFlow: The $26,000 Question
### A One-Pager for District Decision-Makers

*Updated July 2026*

---

## The Problem

Teachers are juggling 5-7 different edtech subscriptions:

- Text leveling: Newsela, Diffit
- Gamified quizzes: Kahoot, Quizizz
- Interactive lessons: Nearpod, Pear Deck
- Accessibility tools: Read&Write, Immersive Reader
- Reading assessment: Amira, Literably
- AI content generation: MagicSchool, SchoolAI

Annual cost for a typical school site: **$20,000-$30,000**.

Each tool requires separate logins, separate training, separate data-sharing agreements, and separate renewal negotiations. Most also create another student-data surface for the district to govern.

---

## The Solution

**AlloFlow** is a single, open-source platform that combines those core categories with specialty accessibility, clinical, STEM, SEL, and local-first tools that districts often cannot afford separately.

| Capability | Typical Tool | Typical Cost | AlloFlow |
|---|---|---:|---|
| Text leveling | Diffit | $3,000/yr | Included |
| Gamification | Kahoot | $3,000/yr | Included |
| Interactive lessons | Nearpod | $5,000/yr | Included |
| Accessibility suite | Read&Write | $4,500/yr | Included |
| Oral fluency assessment | Amira | $3,000/yr | Included |
| AI content generation | MagicSchool | $5,000/yr | Included |
| AAC / symbol boards | Boardmaker | $500+/student | Symbol Studio included |
| PDF accessibility remediation | Human services | $5-25/page | AI pipeline + expert referral path |
| Psychoeducational report writing | Q-Global / Q-interactive | $500+/clinician | Report Writer included |
| **TOTAL, top 6 rows** | | **~$26,000/yr** | **$0 software cost** |

Clinical tools are additive value, not part of the $26K replacement figure.

---

## Why It Is Free

AlloFlow is licensed under **AGPL v3**.

- No subscription fees
- No per-seat licensing
- No freemium upgrade pressure
- Source code is public and auditable
- No vendor lock-in

The software is free. Cloud AI costs depend on the deployment path and provider choices. Gemini Canvas can run under Google Workspace quotas; self-hosted Firebase uses the district's own Google project; Desktop/local paths can use local models where available.

---

## What Is Included

**Hundreds of documented features on a single UDL-aligned platform**, including:

For teachers:

- **Fullpack**: leveled text, glossary, quiz, visual organizer, lesson plan, and scaffolds from source text
- **Live Session**: push resources to student devices with teacher-paced or student-paced modes and per-group differentiation
- **AlloStudio / Open Groove / Video Studio**: born-accessible documents, music, and video workflows
- **Multilingual and voice options** through browser, cloud, Desktop, or optional local voice engines

For students:

- **Adventure Mode**: choose-your-own-adventure learning with XP, inventory, and AI-illustrated scenes
- **Boss Battle / Escape Room / Democracy / Jeopardy**: whole-class cooperative learning games
- **Immersive Reader**: RSVP speed reader, karaoke highlighting, bionic reading, reading ruler, and oral-fluency supports

For special educators, SLPs, and BCBAs:

- **Symbol Studio (AAC)**: AI-generated PCS-style symbols, board builder, visual schedules, social stories, multilingual boards, and parent voice recording
- **BehaviorLens**: FBA/BIP suite with IOA, sampling tools, preference assessments, intervention templates, and restorative-language support
- **Word Sounds Studio**: phonemic-awareness activities with adaptive difficulty

For school psychologists:

- **Report Writer**: standardized assessment presets, fact-chunk PII scrubbing, accuracy audit, and bilingual export
- **Student Analytics (RTI)**: tier classification, aimline monitoring, CBM probes, anomaly flagging, and CSV export
- **PDF Accessibility Pipeline**: multi-auditor AI review, OCR/remediation workflow, axe-core verification, native tagged-PDF output, in-app structural checks, optional local veraPDF QA, redaction, and export options

Curriculum depth:

- **STEM Lab**: 111 tool files / 116 registered plugin IDs across math, life science, earth/space, physics/chemistry, CS, design, and applied simulations
- **SEL Hub**: 70 tools aligned to CASEL and expanded AlloFlow categories such as self-direction, inner work, care of self, and stewardship

---

## Privacy And Compliance

| Concern | Current answer |
|---|---|
| Where does student data go? | Ordinary saves use browser storage or downloaded project files. Live-session and AI data flow depends on deployment mode and selected provider. |
| Do students need accounts? | No. Students can join with session codes or local LAN join links; no PII is required by default. |
| Is it FERPA-compatible? | AlloFlow is designed to support FERPA-aligned deployments, but final compliance depends on district policy, contracts, access controls, retention, consent, and actual use. |
| Google Workspace for Education integration? | Gemini Canvas and Google/Firebase coverage depend on school-account use and the district's agreement with Google. |
| Can we self-host or run locally? | Yes. AlloFlow now has a Desktop local-first path, self-hosted Firebase path, and optional School Box Server stack. |
| What AI model powers it? | The selected provider: Gemini/Imagen, AlloFlow Desktop's built-in local engine, LM Studio, Ollama, LocalAI, or a custom endpoint. |

AlloFlow does not require a developer-operated student database. Districts that need tighter control can use school-owned Firebase, AlloFlow Desktop, Desktop LAN, or the optional School Box Server path.

---

## Deployment Options

1. **Gemini Canvas**: simplest web path for teachers already using Google Workspace.
2. **AlloFlow Desktop**: installed local-first path for teacher laptops. No Docker required for the bundled app, local keys, built-in local engine, or same-room Desktop LAN sessions.
3. **Self-hosted Firebase**: district-owned web deployment using the district's Firebase/GCP project.
4. **School Box Server**: optional Docker server/appliance stack for school-owned boxes, district experiments, persistence/TLS work, and heavier air-gapped infrastructure.

---

## Accessibility

- Built toward **WCAG 2.1 AA** with keyboard-first interaction patterns, audits, and per-tool accessibility gates
- VPAT and audit artifacts are published in the repo
- PDF pipeline supports native tagged-PDF output, structural checks, and optional local veraPDF QA
- Reading supports include dyslexia-friendly fonts, color overlays, bionic reading, reading ruler, RSVP speed reader, and voice options
- Multilingual UI and content support continue to expand

Compliance-sensitive deployments should verify the exact workflows and exports they use.

---

## The Ask

**Pilot AlloFlow in 3-5 classrooms for one semester.**

- Zero software cost to try
- Open-source codebase
- Low IT burden if using the Canvas path
- Desktop/local options for privacy-sensitive pilots

If it works, expand. If it does not, the district has not bought into a subscription stack.

---

## Who Is Behind It

**Aaron Pomeranz, PsyD**
School Psychologist, Portland Public Schools (ME) and developer

- Clinical focus: students with executive-function, attention, and learning differences
- Automated tests cover clinical logic, scoring, PII scrubbing, RTI classification, and assessment presets
- Active partnership and pilot conversations include accessibility, AI-integration PD, and local-first deployment work

---

## Contact

**aaron.pomeranz@maine.edu**

- Website: https://apomera.github.io/AlloFlow
- GitHub: https://github.com/Apomera/AlloFlow
- License: AGPL v3
- VPAT / WCAG audit: see `VPAT-2.5-WCAG-AlloFlow.md` and `alloflow_wcag_aa_audit_report.md`

---

*"Differentiation should not depend on budget."*
