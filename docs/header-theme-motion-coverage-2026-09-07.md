# Header theme and motion coverage

Date: 2026-09-07. Scope: header controls and propagation into the 24 main resource/workflow entries in the current local working tree. This pass preserves the preceding typography improvements.

## Findings and changes

- **Anchor Chart ignored selected palettes on custom paper and inline section surfaces.** Dark reading mode changed its heading to pale text while the paper stayed cream. Actual Chromium rendering measured title contrast at **1.18:1 before** and **13.84:1 after** the repair. Shared rules now coordinate paper, section, icon-placeholder backgrounds, borders and reading ink with the app theme or selected reading palette. Explicit reading palettes take precedence. Default Light retains the original chart appearance. The rules apply on screen and preserve image pixels and authored export styling.
- **The app animation preference did not stop all navigation motion.** Shared styles already covered CSS animations/transitions, including pseudo-elements under the OS setting. Added CSS scrolling coverage for the explicit app setting. Curriculum Audit dimension links, Assess question navigation and Document Builder section/heading/comment/reference/revision/find/semantic-check navigation now check **app preference OR device preference** when invoked. Audit omits its target flash under either preference. Builder jumps use immediate iframe scrolling so authored smooth-scroll CSS cannot override the preference. Navigation and focus still occur.
- **Theme persistence issue identified for the coordinating workstream.** The host setter wrote its argument before the reducer resolved functional updates. Header cycling could persist function text while changing the displayed theme correctly. Root owns the host correction and tests; no host edits were duplicated here.
- **Motion control semantics clarified for root.** The app toggle should expose its own preference and explain that device reduced-motion settings also apply. An effective-state indicator may combine them, but should not make the interactive app toggle appear permanently pressed because of a device setting.

## Coverage across the 24 main resources

Ordinary resource results share the app shell and lesson reading-theme boundary. Native text, controls and CSS transitions receive these settings through that boundary. The following grouping accounts for all 24 entries.

| Resource group | Reviewed behavior |
| --- | --- |
| Analyze Source, Glossary, Text Adaptation, Word Sounds | Shared theme boundary and CSS motion paths; existing prepared-resource and local control behavior retained. |
| Visual Organizer, Notes, Anchor Chart, Memory Aid, Applied Challenge, Lesson Images, FAQ, Writing Scaffolds | Shared boundary reviewed. Anchor Chart custom surfaces were the confirmed palette exception and are repaired. Image pixels retain their original content. |
| Activities, Interview, Sequence Builder, Concept Sort, DBQ | Shared boundary and representative animation patterns. Sequence loading/entry effects are covered by shared CSS reduction. Learning timers and intentional interactions are preserved. |
| STEAM Lab, Adventure | Main entry and host shell reviewed. Independent simulations, embedded plugin palettes, canvas/WebGL scenes and game-specific motion controls were not exhaustively audited. |
| Assess, Curriculum Audit, Lesson Plan, Assignment Directions | Shared result boundary reviewed; Assess/Audit navigation motion repaired. Directions authoring is app chrome rather than a reading-palette document. |
| Preview, Package & Deliver | Builder navigation motion repaired. Editing chrome follows app controls; authored/exported documents retain their separate output theme. |

This is a propagation review and focused actual-renderer validation, not a claim that all 24 complete classroom workflows were manually exercised.

## Validation

**116 tests passed across 6 suites**, including 8 new browser/actual-handler checks.

- Real Anchor Chart rendered under **30 app-theme × reading-theme combinations**: Light/Dark/Contrast crossed with all ten reading options. Paper, section, placeholder-icon and text colors match the selected palette.
- CSS animation, pseudo-element animation, transitions and scrolling checked with the app preference alone, device preference alone, and neither preference.
- Actual Audit, Assess and Builder navigation callbacks exercised under all four app/device preference combinations; scrolling and preserved focus checked.
- Existing reading-palette, AppStyles generation, Curriculum Audit rendering/logic and Builder recommendation suites passed.
- Rebuilt AppStyles, Audit, Assess and Export Preview modules. All four parse and match their desktop public mirrors. AppStyles source/generated freshness and whitespace checks pass.

The normal AppStyles write initially encountered the workspace's known Windows file-lock error. Its exported builder plus the project's atomic writer completed regeneration; the final module matches canonical output.

Changed files: app_styles_source.jsx/module; view_alignment_report_source.jsx/module; view_quiz_source.jsx/module; view_export_preview_source.jsx/module; their desktop public mirrors; tests/header_theme_motion_browser.test.js.

No deployment or commit. Physical printing, manual screen-reader use, animated image/video assets and every independent STEAM/Adventure renderer remain outside the measured checks.
