# AlloFlow: The $26,000 Question
### A One-Pager for District Decision-Makers

*Updated April 2026*

---

## The Problem

Your teachers are juggling 5–7 different EdTech subscriptions:

- **Text leveling** (Newsela, Diffit)
- **Gamified quizzes** (Kahoot, Quizizz)
- **Interactive lessons** (Nearpod, Pear Deck)
- **Accessibility tools** (Read&Write, Immersive Reader)
- **Reading assessment** (Amira, Literably)
- **AI content generation** (MagicSchool, School AI)

**Annual cost for a typical school site: $20,000–$30,000.**

Each tool requires separate logins, separate training, separate data-sharing agreements, and separate renewal negotiations. Most collect student data your district is already struggling to govern.

---

## The Solution

**AlloFlow** is a single, open-source platform that combines all six categories — plus specialty clinical tools that typically aren't even part of the subscription stack because districts can't afford them.

| Capability | Typical Tool | Typical Cost | AlloFlow |
|---|---|---|---|
| Text leveling | Diffit | $3,000/yr | ✅ Included |
| Gamification | Kahoot | $3,000/yr | ✅ Included |
| Interactive lessons | Nearpod | $5,000/yr | ✅ Included |
| Accessibility suite | Read&Write | $4,500/yr | ✅ Included |
| Oral fluency assessment | Amira | $3,000/yr | ✅ Included |
| AI content generation | MagicSchool | $5,000/yr | ✅ Included |
| AAC / symbol boards | Boardmaker | $500+/student | ✅ Symbol Studio included |
| PDF accessibility remediation | Human services | $5–25/page | ✅ AI pipeline + Knowbility referral |
| Psychoeducational report writing | Q-Global / Q-interactive | $500+/clinician | ✅ Report Writer included |
| **TOTAL (top 6 rows)** | | **~$26,000/yr** | **$0** |

Clinical tools (bottom 3 rows) aren't included in the $26K figure because most districts can't afford them at all — they're additive value, not replaced subscriptions.

---

## Why It's Free

AlloFlow is licensed under **AGPL v3** (the same license as Linux).

- No subscription fees
- No per-seat licensing
- No "freemium" upgrade pressure
- Source code is public and auditable
- No vendor lock-in

Built by a school psychologist, for educators. The catch? There isn't one.

---

## What's Included

**100+ integrated tools on a single UDL-aligned platform**, spanning:

**🎓 For teachers**
- **Fullpack** — one click generates leveled text (K–graduate), glossary, quiz, visual organizer, lesson plan, and scaffolds from any source text
- **Live Session** — push any resource to student devices in real time, with teacher-paced or student-paced modes and per-group differentiation
- **18-language UI** with offline TTS (40+ languages via Kokoro + Piper)

**🎮 For students**
- **Adventure Mode** — choose-your-own-adventure RPG with XP, inventory, and AI-illustrated scenes
- **Boss Battle / Escape Room / Democracy / Jeopardy** — full-class cooperative learning games
- **Immersive Reader** — RSVP speed reader, karaoke highlighting, bionic reading, adjustable reading ruler, oral fluency coach

**🩺 For special educators, SLPs, and BCBAs**
- **Symbol Studio (AAC)** — AI-generated PCS-style symbols, board builder, visual schedules, social stories (Carol Gray format), multilingual boards in 14 languages, per-cell parent voice recording, 8 student profiles
- **BehaviorLens** — full FBA/BIP suite with 6 IOA methods, 5 sampling types, MSWO/Paired/Free-Operant preference assessments, intervention templates, restorative-language layer
- **Word Sounds Studio** — 8 phonemic awareness activity types with grade-normed adaptive difficulty
- **StoryForge** — 6-phase scaffolded writing with Imagen illustration, 8 TTS voices, custom rubrics, sprint timers

**🧠 For school psychologists**
- **Report Writer** — 17 standardized assessment presets (WISC-V, WIAT-4, BASC-3, Vineland-3, BRIEF-2, Conners-4, WJ-IV, KABC-II, DAS-II, CELF-5, KTEA-3, SRS-2, GARS-3, BOT-2), fact-chunk PII scrubbing, self-healing accuracy audit, bilingual export
- **Student Analytics (RTI)** — Tier 1/2/3 classification with aimline monitoring, ORF / Math Fluency / Literacy CBM probes, anomaly flagging, CSV export
- **PDF Accessibility Pipeline** — 5-auditor triangulated AI audit with ICC/Cronbach's-α statistics, Vision API remediation, axe-core verification, self-healing auto-fix loop, export to accessible PDF/HTML/audio

**🔬 STEM Lab (77 simulations)** — math fundamentals through advanced calculus, life/earth/space science, physics/chemistry, CS/tech, creative, plus specialty labs (RoadReady driver's ed, Space Explorer roguelike, LLM Literacy Lab, AppLab generative-AI mini-app builder, and more).

**💚 SEL Hub (27 tools)** — aligned to CASEL's 5 competencies: self-awareness, self-management, social awareness, relationship skills, responsible decision-making. Includes Growth Mindset Workshop, Restorative Circle, Ethical Reasoning Lab, Culture Explorer.

---

## Privacy & Compliance

| Concern | Answer |
|---|---|
| **Where does student data go?** | Nowhere. All data stays on-device in the browser's local storage. |
| **Do students need accounts?** | No. Join via 4-character session codes. No PII ever required. |
| **Is it FERPA-compatible?** | Yes. No PII collection, no external databases, no third-party data brokers. |
| **Google Workspace for Education integration?** | Runs inside Gemini Canvas with your district's existing Workspace DPA covering it. No new data-processor relationship. |
| **Can we self-host?** | Yes — three deployment paths (see below). |
| **What AI model powers it?** | Google Gemini via your district's Workspace account. District controls the key; no shared API billing. |

**Your IT department can deploy AlloFlow on district infrastructure — no vendor servers, no new data agreements, no procurement gridlock.**

---

## Deployment options

1. **Gemini Canvas (simplest)** — zero install. Teachers launch AlloFlow in Google's Gemini Canvas on their Workspace account. No IT ticket required.
2. **Self-hosted Firebase** — for districts that want their own deployment. Hosts as a static site on your district's Google Cloud. Docs provided.
3. **School Box air-gap** *(in development with [Physher](https://physher.com))* — full local stack on district hardware. Ollama LLM + local database + local TTS + SearXNG. Zero external API calls, zero ongoing costs. For districts with the strictest data-sovereignty requirements.

---

## Accessibility

- **WCAG 2.1 AA** — 5,608+ aria-labels across 97 files at 98%+ code-level coverage. VPAT published (April 2026). Runtime verification with screen-reader users in progress via partnership conversations with **Knowbility**.
- **Text-to-Speech** — two offline engines (Kokoro for English, Piper for 40+ languages); audio never hits cloud APIs.
- **Reading supports** — dyslexia fonts (OpenDyslexic, Lexend), color overlays (Irlen), bionic reading, reading ruler, RSVP speed reader.
- **Keyboard navigation** — full keyboard accessibility; no mouse-required interactions.
- **Multilingual UI** — 18 languages with community-contributed translations.

---

## The Ask

**Pilot AlloFlow in 3–5 classrooms for one semester.**

- **Zero cost** to try
- **Zero procurement paperwork** — it's open-source
- **Zero IT burden** if you use the Canvas deployment path

If it works, expand. If it doesn't, you've lost nothing. Pilots launching Fall 2026; early-pilot districts receive direct support from the creator and help shape the roadmap.

---

## Who's behind it

**Aaron Pomeranz, PsyD**
School Psychologist, Portland Public Schools (ME) & Developer

- Clinical focus: students with executive-function, attention, and learning differences
- 117 passing clinical-logic tests verifying scoring, PII scrubbing, RTI tier classification, assessment-preset integrity
- Active partnership conversations: Knowbility (WCAG + AccessWorks usability testing), Holly Clark (AI-integration PD), Physher (School Box deployment)

---

## Contact

**aaron.pomeranz@maine.edu**

- **Website:** https://apomera.github.io/AlloFlow
- **GitHub:** https://github.com/Apomera/AlloFlow
- **License:** [AGPL v3](https://www.gnu.org/licenses/agpl-3.0.html) (open source)
- **VPAT / WCAG audit:** see [VPAT-2.5-WCAG-AlloFlow.md](./VPAT-2.5-WCAG-AlloFlow.md) and [alloflow_wcag_aa_audit_report.md](./alloflow_wcag_aa_audit_report.md) in the repo

---

*"Differentiation shouldn't depend on budget."*
