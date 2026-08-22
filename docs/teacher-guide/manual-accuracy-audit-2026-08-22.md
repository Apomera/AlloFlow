# Teacher Guide accuracy audit — 22 August 2026

## Scope and source of truth

This audit covers the 27 canonical Markdown chapters listed in `guide.json`, the generated searchable and complete web guides, the offline guide, the manuals hub, and the maintained live-screenshot index. Generated HTML is a build artifact; corrections belong in the canonical Markdown, manifest, CSS, or screenshot index and are then rebuilt.

Claims were checked against the current repository source and, where relevant, the exact August 20, 2026 Gemini Canvas capture set. Legal wording was checked against the primary federal regulation page rather than inferred from product code. A screenshot proves what that captured build displayed; it does not prove that a feature works in every deployment.

## Findings and corrections

| Risk | Finding | Evidence reviewed | Correction and status |
| --- | --- | --- | --- |
| Critical | The multilingual vignette used Custom Instructions as though they selected Arabic. | `view_sidebar_panels_module.js`, `text_pipeline_helpers_module.js`, and the Glossary language summary in `02-glossary-panel.png`. | Corrected. Arabic is added to the shared language list in Universal Settings. Glossary reads that list. Custom Instructions only refine glossary content. |
| High | The manual blurred the shared language list, primary output language, and companion Translations policy. | `translationTargetChoices`, `resolveTranslationPolicy`, and `isTranslationControlRelevant` in `text_pipeline_helpers_module.js`. | Corrected in Universal Settings, Prepare a lesson, and the multilingual vignette. The guide now explains why the Translations selector can be hidden even while Glossary uses a selected language. |
| High | Several workflow screenshots appeared repetitive because the same dominant source-analysis area occupied most of each frame. | Untouched 1536 × 902 masters and the published vignette sequences. | Corrected in presentation. Setup images use `Focused controls view`, which enlarges the distinct left panel; result and delivery images retain `Focused app view`. Original PNGs remain unchanged. |
| High | A fixed STEAM Lab count would become stale. The capture reported 137 tools while the current generated registry reports 145. | `tool_index.json` and the screenshot index. | Corrected. The guide sends readers to the live catalog and no longer prints a fixed total or fixed category counts. |
| High | Product-wide “no account,” “no server,” “nothing uploaded,” and “nothing syncs” language ignored connected routes. | Live-session Firestore paths in `teacher_module.js`; AI providers; LMS, Apps Script, share, portal, and backup paths documented in source. | Corrected across rollout, family, leadership, saving, privacy, and IT guidance. The manual now distinguishes the local authoring default from each configured route. |
| High | “No AI” was described as though every simulation and activity remained complete. | STEAM Lab source, including AI-dependent extras and an activity with AI-required drills. | Corrected. Many core routes remain available; AI generation, coaching, hints, drills, and connected lookups are verified per activity. |
| High | The document-remediation “local” route was described as guaranteed no-egress. | Local connector, configurable model endpoint, desktop host, and export paths. | Corrected. No-egress now requires verification of endpoint location, telemetry, logging, retention, and export destination. |
| High | Meeting Documentation implied that every name was automatically masked. | `meetdocsMaskPairs`, the **Names to mask** UI, and prompt construction in `meeting_docs_module.js`. | Corrected. Only names explicitly added to the masking list are replaced; omitted names can reach the configured provider. |
| High | Custom Instructions in the assessment vignette could be read as enabling recording or drawing. | Assess and Assignment Directions captures plus the delivery workflow. | Corrected. The prompt only shapes wording; response tools must be provided and tested separately. |
| Medium | Exported HTML was described as unconditionally self-contained and offline. | Document/export guidance and optional external fonts, links, media, and connected interactions. | Corrected. Offline use is a design goal that must be tested on the exact export. |
| Medium | Notices and read-aloud behavior used absolute persistence and timing language. | Current message and audio control descriptions. | Corrected to retained-current-workspace notices and prompt recovery guidance rather than “nothing is lost” or “always instant.” |
| Medium | The IDEA initial-evaluation timeline needed the exact state-timeframe qualification. | [34 CFR § 300.301(c)(1)](https://sites.ed.gov/idea/regs/b/d/300.301). | Corrected. The guide states the federal 60-calendar-day rule and the state-established-timeframe exception, with a primary-source link and a legal-review warning. |

## Verified details retained

These claims were rechecked and remain in the guide with their stated boundaries:

- Storage presets currently show Standard at about 20 workspaces / 150 MB / 50 offline resources and Compact at about 4 / 50 MB / 20 offline resources, with the current 14-day old-unpinned-draft rule.
- Family Announcements currently defines 16 language presets, includes right-to-left metadata where needed, and adds a machine-assisted translation disclosure and language/direction markup to exports.
- Meeting Documentation verifies supporting quotes as exact substrings of the masked source and flags unmatched quotes; this does not validate the truth or completeness of a drafted claim.
- The reviewed Educator Evaluation `Code.gs` contains zero `UrlFetchApp` references. Deployment review must repeat that check against the installed commit and account for Google services the script intentionally uses inside the tenant.
- Adventure language behavior has its own lesson-facing choice and uses the resolved Universal Settings translation target when a companion language is requested.
- The current `tool_index.json` reports 145 STEAM Lab entries in 13 categories as of this audit. Those numbers are evidence for the audit only and are intentionally not frozen into instructional prose.

## Screenshot publication rules

1. Keep the full-resolution Canvas captures as audit masters; do not inpaint controls or generated results.
2. Use a controls-focused frame when the teaching decision is in the left panel and an app/result frame when the decision is in generated output or delivery.
3. Do not reuse one screenshot for two steps unless the caption explicitly explains the different evidence being inspected.
4. A setup screenshot must not be described as proof that generation, export, submission, or accessibility succeeded.
5. Record capture date, viewport, synthetic source, sign-in context, visible overlays, and known incomplete results in the screenshot index.

## Maintenance rules

- Do not put catalog counts, fixed button totals, or provider menus in prose unless they are generated from current source or explicitly dated as an example.
- Do not use Custom Instructions to explain a state change controlled by a selector, toggle, language list, permission, or delivery configuration.
- Avoid product-wide absolutes about accounts, storage, uploads, encryption, servers, offline behavior, or AI availability. Name the deployment and route.
- Treat screenshots as dated evidence, not evergreen documentation. Pair them with text that remains accurate when layout changes.
- Re-run the guide build, teacher-guide verification, manuals verification, and documentation audit after canonical changes.

## Reproduction

```text
npm run build:teacher-guide
npm run verify:teacher-guide
npm run verify:manuals
npm run audit:docs
```

The current review is an evidence-backed documentation audit, not a security certification, legal opinion, accessibility conformance claim, or guarantee that every optional integration is configured correctly in a particular school.
