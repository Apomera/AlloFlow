# Promotional claim evidence — September 4, 2026

Scope: the local AlloFlow homepage, feature tour, feature catalog, district overview, and lesson library, compared with the current working-tree implementation and maintained guides. This is an implementation and copy review, not a deployment audit, independent clinical validation, translation certification, or learning-outcomes study. Changes remain unpublished.

| Topic | Evidence checked | Finding and promotional correction |
| --- | --- | --- |
| Coding | [Coding Playground](../stem_lab/stem_tool_coding.js#L2685); [communication bridge](../view_gemini_bridge_source.jsx#L17) | The inspected coding tool exposes Turtle and Robot modes plus supported visual, step-list, and text editors. The inspected Gemini Bridge is a communication interface. The advertised automatic Python/React/p5.js environment and risk-free execution could not be substantiated in these implementations. Replaced that slide and summary with the verified Coding Playground. This does not claim no other deployment can run code. |
| Report fact verification | [Fact extraction and reviewer locking](../report_writer_module.js#L2413) | Score and background chunks start with verified:false and immutable:false. Reviewer verification sets the lock. Replaced the claim that extraction itself creates immutable facts; kept professional review central. |
| Report stages and presets | [Wizard stages](../report_writer_module.js#L1566); [preset definitions](../report_writer_module.js#L877) | The wizard has 10 stages. There are 17 preset entries: 16 named entries, including separate BASC parent/teacher forms, plus Custom Assessment. Retained the verified stage count and described presets with custom entry rather than implying 17 distinct standardized assessments. Presets do not establish the correctness of a clinical interpretation. |
| Report audience adaptation | [Section rewrite function](../report_writer_module.js#L1944); [audience selector](../report_writer_module.js#L4302) | The selector offers parent, professional, elementary-student, and secondary-student audiences. Adaptation replaces the selected section; it does not automatically create three complete report versions. Changed the callout to audience-specific section rewrites. Prompt instructions to preserve facts do not guarantee preservation. |
| De-identification | [Scrubbing implementation](../report_writer_module.js#L2314) | Pattern-based replacement covers configured names and some identifier formats. This is a safeguard, not a guarantee that all identifying information is removed. Copy calls for inspecting provider-bound content and reviewing identifying details. |
| Fluency estimates | [Review implementation](../fluency_module.js#L284); [review contract tests](../tests/fluency_review.test.js#L37) | Review preserves an automated snapshot and records corrections and review history. The page now distinguishes automated estimates from teacher-reviewed evidence instead of claiming manual running records are unnecessary. These application tests were read as evidence; this promotional pass did not rerun the application's full test suite. |
| Language packs | [Manifest](../lang/manifest.json); [selector provenance and fallback](../ui_language_selector_source.jsx#L100) | The directory, manifest count, and available list each contain 63 packs. The selector supports AI-draft, partial-draft, and English-placeholder states and falls back when a pack is unavailable. A file count is not proof of complete translation, equal key coverage, or fluent-speaker review. Removed universal translation and already-reviewed-pack claims. |
| Source material and learner supports | [Purposeful lesson planning](../docs/teacher-guide/chapters/02-prepare-a-lesson.md); [accessibility and UDL](../docs/teacher-guide/chapters/04-accessibility-and-udl.md) | The guide calls for shared goals, selected supports, source comparison, and learner/device checks. Removed promises that every learner reads independently, reward systems create intrinsic motivation, a font solves reading difficulty, or a selected DOK label validates cognitive demand. |
| Offline and connected use | [Saving and storage](../docs/teacher-guide/chapters/24-saving-and-storage.md); [privacy and responsible AI](../docs/teacher-guide/chapters/07-privacy-and-responsible-ai.md) | Local workspace persistence, exports, AI providers, and connected sessions have different boundaries. Descriptions distinguish those paths and require testing supported offline exports. |
| Illustrative metrics | Homepage SVG diagrams | Reading variants, WCPM, report checks, and dashboard figures are illustrative displays, not real learner results or outcome evidence. Captions now state their illustrative status. |
| Feature-tour inventory | Homepage static markup and runtime controls | The tour has 26 slides. Runtime controls and labels follow the slides; static dots and the initial counter now match, so raw HTML no longer reports 22 slides or provides only 23 dots. |

The [CAST UDL Guidelines](https://udlguidelines.cast.org/) describe options for instructional design; their existence does not validate AlloFlow's effectiveness. [MDN's iframe documentation](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe#sandbox) likewise describes configurable restrictions, not a blanket guarantee of risk-free execution. Those distinctions informed removal of universal pedagogy and sandbox promises.

## Maintenance

Run the promotional audit after copy or inventory changes:

    node dev-tools/audit_promo_site.cjs

It now checks specific unsupported phrases in normalized text, current language-file inventory, and static tour counts. This detects known regressions; it cannot establish that arbitrary new marketing claims are true. Verify new quantitative, efficacy, privacy, and security claims against primary evidence before publishing them.

Do not infer production performance, indexation, clinical validity, accessibility conformance, or learning gains from local browser checks. Recheck the deployed build and relevant independent evidence before making those claims.

## Local validation

The promotional audit passed for 10 pages with no warnings or errors; wave-3 and AI-discovery audits passed. The integrated browser suite passed navigation, sample copy/download and fallback paths, the 33-tool catalog, feedback, responsive layouts, scoped axe checks, and no-JavaScript behavior. A separate tour check visited all 26 slides at 1440 and 390 pixels, verified matching controls and unclipped content, and checked contrast on the report, coding, fluency, and reader slides. Coding and report captures were visually reviewed. These are local checks, not a production or complete accessibility audit.

## Supporting-page consistency and downloadable examples

The feature and district pages repeated older claims about coding sandboxes, complete transcripts, unlimited symbols, universal language coverage, and self-healing report accuracy. Their descriptions now follow the source-backed boundaries above. Import and export copy calls for checking extracted text and imported quizzes; project storage guidance follows the maintained saving-and-storage chapter. The feature-page introduction links to the requirements-aware tool finder and the worked classroom example.

The library advertised the American Revolution while linking to the Civil War file. The card now names the American Civil War. Pack summaries and counts were checked directly against each JSON history and source:

| Download | Saved resources | Examples present |
| --- | --- | --- |
| [Water cycle](../examples/water_cycle.json) | 10 | Glossary, concept sort, quiz, lesson plan |
| [American Civil War](../examples/civil_war.json) | 8 | Glossary, visual organizer, quiz, lesson plan |
| [Photosynthesis](../examples/photosynthesis.json) | 8 | Glossary, concept sort, quiz, lesson plan |

Unsupported fixed grade and standards labels were replaced with sample-project labels and actual contents. The page explains that generated grade labels and alignment reports require review. No lesson JSON was changed or independently validated by this promotional pass. Search and social descriptions now name the three available topics instead of advertising subjects with no downloadable pack.

Filters now cover only available subjects, expose their selected state, and announce result counts. Without JavaScript, all downloads remain visible and the inactive filter controls are hidden. The audit compares card topics and resource counts with their real files and flags filters without available packs.

Supporting-page validation passed for the library, feature catalog, and district overview at 320, 390, 1025, and 1440 pixels. Checks cover horizontal overflow, keyboard filtering, selected and announced result states, downloaded bytes matching the local files, no-JavaScript downloads, unavailable icons, and serious/critical automated accessibility findings at phone and desktop widths. A real-font mobile screenshot was visually reviewed. Repeatable behavior checks use controlled font/icon responses to avoid CDN timeouts.

The tests also exposed a shared reduced-motion issue: staggered card delays remained after animation duration was shortened. Reduced-motion cards now stay fully visible without the cascade, and the browser check verifies their opacity and animation state. These checks remain focused regression evidence, not complete accessibility conformance.
