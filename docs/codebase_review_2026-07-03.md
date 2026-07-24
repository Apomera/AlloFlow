# AlloFlow Codebase Review - 2026-07-03

This review was generated from the live workspace on July 3, 2026. It is meant to be a current, evidence-based companion to `FEATURE_INVENTORY.md`, `architecture.md`, and `COMPETITOR_COMPARISON.md`, not a replacement for every historical design memo.

## How I Reviewed It

I used the repository itself as the source of truth:

- Read coordination and architecture docs: `AGENT_HANDOFF.md`, `architecture.md`, `FEATURE_INVENTORY.md`, `README.md`, `COMPETITOR_COMPARISON.md`, `docs/studio_design.md`, and recent handoff logs.
- Generated file, line, module, and registry counts from `git ls-files --cached --others --exclude-standard`, excluding obvious non-product folders such as `node_modules`, `.git`, `dist`, `test-results`, and archival/input folders.
- Scanned the build map in `build.js`, the STEM and SEL plugin folders, package scripts, test files, and a11y audit outputs.
- Opened representative source files from the current new work: Open Groove/Music Studio, Studio design, STEM/SEL hub shells, and the module build configuration.
- Checked current public competitor positioning from official product sites for the companion competitive note.

Because this is a very large, actively dirty workspace, the counts below are current-local counts, not a clean release tag.

## Current Size And Shape

| Metric | Current local count | Notes |
|---|---:|---|
| Non-ignored files reviewed | 3,822 | Excludes `node_modules`, `.git`, test reports, `dist`, archives, and raw audio-input folders. |
| Physical size reviewed | ~675 MB | Includes JSON assets, public mirrors, PDFs/images that are not excluded, and deploy copies. |
| Text lines counted | ~6.26M | Includes code, docs, JSON, and text assets. |
| Physical code files | 1,886 | `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.html`, `.css`, `.ps1`, `.sh`, `.py`, `.rules`. |
| Physical code lines | ~5.69M | Inflated by generated modules and deploy/public mirrors. |
| Exact-hash unique code | 1,499 hashes / ~4.07M lines | Removes byte-identical duplicates only. Generated source/module pairs still count because compiled output differs. |
| Canonical-ish source cut | 1,250 files / ~2.70M lines | Excludes `desktop/web-app` mirrors and root `_module.js` files when a matching `_source.jsx` exists. |
| STEM tool files | 111 | `stem_lab/stem_tool_*.js` on disk. Static scan finds 116 unique `window.StemLab.registerTool(...)` IDs because a few files export aliases or paired tools. |
| SEL tool files | 70 | `sel_hub/sel_tool_*.js`; one registered ID per file. |
| Top-level build modules | 151 | `MODULES` entries in `build.js`; includes 4 Open Groove/Music Studio entries. |
| JSX source/module pairs | 111 | Root `*_source.jsx` files with generated `*_module.js` counterparts. |
| Tests | 413 code test files | Heavy coverage around PDF/doc pipeline, STEM/SEL rendering, live session, Lumen, Video Studio, Studio core, and security gates. |
| Dev/audit tools | 157 code files | Static gates, render checks, registry checks, visual/a11y QA, i18n, PDF, security, and build verification. |

The headline is not "2.7M hand-written product lines." The honest interpretation is: AlloFlow is a very broad app with a large amount of generated/mirrored runtime code, large language/string packs, and many self-contained simulation tools. Documentation should always report both physical footprint and de-duplicated/canonical caveats.

For a file-level size artifact, see [code_size_inventory_2026-07-03.csv](code_size_inventory_2026-07-03.csv). It lists the canonical-ish source set by exact content hash, with representative path, top area, extension, line count, byte size, duplicate count, duplicate paths, and SHA-256. That generated inventory currently contains 1,250 canonical-ish code files collapsed to 1,249 unique hashes.

## Why It Is Designed This Way

### 1. Gemini Canvas forces a single-artifact host

The main app is still centered on `AlloFlowANTI.txt`, compiled to `desktop/web-app/src/App.jsx`. That looks strange until you remember the primary distribution target: Gemini Canvas. Canvas wants a self-contained artifact and injects platform services, so the host keeps state, role gates, language context, module loading, AI bridges, and runtime shims in one place.

The design cost is a large container. The benefit is very low-friction distribution: a teacher can open one artifact and use a whole toolkit without a district SaaS install.

### 2. Hub-and-spoke modules keep the initial load survivable

The feature set is too large to ship as one eager bundle. The codebase uses a hub-and-spoke model:

- `AlloFlowANTI.txt` owns state and routes.
- `loadModule(name, url)` lazy-loads large top-level modules.
- STEM and SEL tools self-register through `window.StemLab.registerTool` and `window.SelHub.registerTool`.
- Root `*_source.jsx` files compile to IIFE `*_module.js` CDN modules.
- `build.js` copies managed modules into `desktop/web-app/public` and rewrites deploy URLs.

This is why there are so many public mirrors and generated files. They are not accidental; they are part of a Canvas plus CDN deployment model.

### 3. Window globals are a compatibility contract

The modules do not use normal imports at runtime. They expect `React`, icon globals, contexts, helper modules, and registries on `window`. That is less elegant than a bundled React app, but it lets independently loaded CDN files work inside Canvas, Firebase Hosting, and local/self-hosted variants.

The same pattern also explains defensive fallback registries inside plugin files: an individual tool can load before or without the hub shell and still avoid crashing.

### 4. Privacy goals shape data flow

The app repeatedly favors local or session-scoped data over server persistence:

- Student names and PII are avoided by design.
- SEL tool work is local or exported deliberately.
- Live quiz/session work has moved toward P2P/WebRTC where possible, with Firestore as signaling/fallback rather than long-term student record storage.
- Clinical and educator-only features are behind TeacherGate.
- School Box/Docker remains the mitigation path if Canvas or cloud inference becomes unacceptable for a district.

This is not merely a technical choice. It is part of the product identity.

### 5. Accessibility is infrastructure, not a bolt-on

Accessibility shows up at multiple layers:

- Published VPAT/WCAG docs and a11y audit artifacts.
- `a11y-audit` runtime/static checks.
- STEM and SEL render/a11y/visual QA gates.
- Theme/high-contrast overrides in STEM and SEL shells.
- Tagged PDF, PDF/UA, veraPDF, reading-order, table, alt-text, contrast, and export tests.
- Adaptive controller/gamepad support and no-mouse interaction goals.

That is one of the clearest differences between AlloFlow and normal AI worksheet tools.

## Functionality Currently Present

### Core learning pack engine

AlloFlow can take source material from pasted text, generated text, documents, images, URLs, audio, and video transcripts, then produce leveled readers, glossaries, quizzes, outlines, sentence frames, timelines, DBQs, lesson plans, image supports, Socratic supports, and exportable resource packs.

The core design is UDL-first: multiple representations, multiple expression modes, and multiple engagement pathways are generated from a single source.

### Document and PDF pipeline

The document pipeline is one of the deepest subsystems. It includes OCR paths, AI-assisted audits, table/heading/reading-order repairs, contrast and alt-text checks, redaction, fillable worksheet generation, tagged PDF output, ePub/ODT/DAISY-style export paths, veraPDF/PDF-UA validation, and extensive unit coverage.

This is not just "export a PDF." It is closer to an accessibility remediation workbench embedded inside an education app.

### STEM Lab

The current local workspace has 111 STEM tool files and 116 registered plugin IDs. The tools span math, science, engineering, ecology, life skills, creative tools, technology, strategy games, music/speech, and applied simulations. Standout large tools include RoadReady, Plate Tectonics, Cell, SkySchool/Flight Sim, Chemistry Lab, Raptor Hunt, Solar System, Cephalopod Lab, Optics Lab, Aquaculture Lab, Aquarium Lab, BirdLab, PrintingPress, NutritionLab, Assessment Literacy, AppLab, Learning Lab, Beehive, Typing Practice, FisherLab, Fractions, WeldLab, Companion Planting, Art Studio, and Auto Repair.

The STEM hub also has search, category filters, AI tool suggestions, stations, XP, render/a11y gates, and recent visual polish work.

### SEL Hub

The SEL Hub has 70 tool files, 70 registered IDs, 9 category filters, curated pathways, teacher launch plans, a shared safety layer, local/share-packet persistence, and recent visual/a11y QA. It goes beyond baseline CASEL by adding self-direction, inner work, care of self, and stewardship as explicit categories.

The design stance is careful: SEL outputs are not IEP-quality data, not surveillance, and not a replacement for trusted adults or clinical care. That honesty should stay visible.

### Educator and school psychology tools

The codebase includes BehaviorLens, Report Writer, Student Analytics/RTI, psychometric probe JSONs, CBM/fluency work, Teacher Dashboard, live session tooling, TeacherGate, and educator-only workflows. This is where the creator's school psychology background is most obvious.

### Media and studio tools

Current modules include Cinematic Studio, Video Studio, AlloStudio, and the new Open Groove/Music Studio work.

- Video Studio has local capture/editing, captions, transcripts, visual descriptions, overlays, background music, export metadata, and resource cue picking.
- AlloStudio is a born-accessible object editor for flyers/worksheets/digital art, with scene graph, reading order, alt/decorative gates, and provenance ledger design.
- Open Groove Studio is a browser music-production/composition tool with project model, pads, patterns, synth/sampler/audio/notation concepts, timing math, licensing checks, audio engine, and accessible shell.

These move AlloFlow beyond "generate classroom text" into creation studios.

### Live sessions and classroom sync

Live session work includes teacher-paced and student-paced modes, resource pushes, group and per-student sends, delivery acknowledgements, P2P quiz transport, polling, Boss Battle, Pictionary, escape-room pieces, Firestore rules, and privacy posture documentation.

This is powerful, but it is also one of the areas where competitors can still beat AlloFlow on polish and deployment confidence.

### AlloHaven and motivation layer

AlloHaven is not conventional gamification. It is closer to a calm meta-experience with portfolio, reflection, tokens, idea garden, daily flow, and low-pressure reward design. Recent tests cover economy, idea garden, and contrast.

The differentiator is restraint: no leaderboard-first motivational architecture.

### Language and accessibility presentation

The repo contains 63 language files plus a very large `ui_strings.js`. There are i18n build scripts, translation key checks, stale translation checks, Spanglish safety checks, RTL/language tests, and UI language selector work. The current docs should describe this as a major subsystem, not a side feature.

### Verification infrastructure

The `package.json` scripts and `dev-tools` folder show a mature custom verification suite:

- Registry and module render checks.
- STEM/SEL render, behavior, a11y, visual QA, and tile catalog checks.
- PDF pipeline checks.
- Security checks for secrets, CORS, XSS, eval, npm audit, and LTI.
- i18n and language JSON checks.
- Build smoke, mirror, source-pair drift, stale source, and placeholder checks.

The test suite is not small anymore. It is broad, but it still favors unit/static/golden checks over full browser end-to-end flows for complex educator workflows.

## Areas For Improvement

1. Normalize tool metadata.

STEM and SEL tools render, but metadata is inconsistent. Some STEM files use `name`, some `label`, some `description`, some `desc`, and some register aliases. A small metadata schema plus a generated catalog would make docs, search, QA, and marketing claims much easier to keep current.

2. Generate documentation from the registry.

The feature inventory should not be maintained only by hand. A docs generator could scan `build.js`, STEM/SEL registrations, module names, test coverage, and known status tags, then produce a machine-generated appendix. Human docs would then explain meaning and positioning.

3. Separate archival docs from source-of-truth docs.

There are hundreds of Markdown files, many of them valuable historical memos. Add a short "Current Sources of Truth" index so reviewers know to trust `README.md`, `architecture.md`, `FEATURE_INVENTORY.md`, `COMPETITOR_COMPARISON.md`, this review, and specific active design docs.

4. Make first-run success much calmer.

The product has enough surface area to overwhelm a first-time teacher. The front door should emphasize a small number of undeniable flows:

- Paste or upload source -> generate accessible lesson pack.
- Run a live student activity.
- Open one showcase STEM tool.
- Remediate/check one PDF.
- Try one SEL pathway.

Everything else can be discoverable after the first win.

5. Keep reducing monolith pressure.

The container still owns too much state and too many prop bags. The existing context-consumer pattern and reducers are the right direction. The next wins are active-view router props, teacher/live-session state clusters, and more reducer slices for related state.

6. Consolidate build scripts where it reduces risk.

There are 111 source/module pairs and multiple historical build patterns. They work, but every additional pattern adds cognitive load. A unified build manifest would reduce accidental stale output and make agent collaboration safer.

7. Add release-quality evidence.

Competitors have case studies, district logos, onboarding programs, and formal procurement assets. AlloFlow has code depth and accessibility depth, but needs pilot evidence, usage videos, short workflows, reliability notes, and external accessibility/security review artifacts.

8. Expand end-to-end coverage for the riskiest human workflows.

The most valuable next tests are not more pure helpers. They are browser-level flows for BehaviorLens, Report Writer, PDF remediation, SEL crisis/safety gating, Live Session, and first-run lesson generation.

9. Audit giant generated or suspicious artifacts.

The repo contains huge string/data files, deploy mirrors, and at least one odd `tests/undefined` file. These may be harmless, but a periodic "repo hygiene" report would help distinguish product assets from accidental leftovers.

10. Formalize readiness tiers.

The docs should use a consistent Ready / Beta / Experimental / Design-only status. The broad surface is a strength only if users know which parts to trust first.

## Expansion Opportunities

- A generated public tool catalog with filters by subject, grade band, readiness, accessibility status, and standards.
- A "district evidence packet" export: VPAT, privacy posture, data-flow map, architecture summary, sample lesson, and procurement talking points.
- A guided "five-minute AlloFlow" mode for first-time teachers.
- More interoperable exports to Google Classroom, Docs, Slides, Forms, LMS, and district repositories.
- A cohesive creator suite: AlloStudio + Video Studio + Cinematic Studio + Open Groove, all born-accessible and provenance-aware.
- A stronger pilot analytics layer that measures product usability without collecting student PII.
- A formal local School Box track with a plain status page: what works offline today, what still needs cloud APIs, and what hardware is required.

## Bottom Line

AlloFlow is no longer just a UDL lesson generator. The current codebase is a broad, local-first, accessibility-heavy learning platform with specialized school-psychology, SEL, STEM, media-studio, and document-remediation subsystems.

The design is unusual because the distribution target is unusual. Canvas plus CDN modules plus local-first privacy created a system that looks less like a typical SaaS React app and more like a portable education operating system. That is both the advantage and the maintenance challenge.

The highest-leverage next move is not adding another hundred features. It is making the existing strongest workflows obvious, trustworthy, documented from the code, and easy to demo.
