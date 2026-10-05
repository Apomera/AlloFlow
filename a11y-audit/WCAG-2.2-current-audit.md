# AlloFlow WCAG 2.2 A/AA Current Audit

**Updated:** October 2, 2026 (UTC); evidence review only

**Product:** AlloFlow v1.6 web metadata; local working tree

**Status:** All 55 criteria and 24 catalog cards reviewed; release-level conformance determination incomplete. Known historical defects, live candidates, local fixes and untested requirements remain distinct.

See the [September 19 follow-up](../reports/wcag-audit-2026-09-19/README.md) and [current VPAT](../VPAT-2.5-WCAG-AlloFlow.md).

## October 2 2026 evidence review

This is a comprehensive document/criterion/source-inventory review, not a completed runtime conformance audit. The authoritative [ACR](../VPAT-2.5-WCAG-AlloFlow.md) remains in Markdown and covers WCAG 2.2 A/AA (31 A + 24 AA). All 55 criteria now have explicit review remarks; incomplete determinations use a clearly nonstandard draft **Pending determination** status instead of treating missing evidence as Partially Supports or Not Applicable. Prior ratings and findings are preserved in each row. No claim of ITI certification, legal compliance or whole-product WCAG conformance is made.

The report's existing WCAG edition/version scope is retained. All six new 2.2 A/AA criteria are present; 4.1.1 is removed. AAA, 508 and EN 301 549 were not added. Before a formal ACR, resolve pending evidence and confirm the current ITI template's required structure and applicability. [ITI](https://www.itic.org/policy/accessibility/vpat), [ITI reporting guidance](https://www.itic.org/documents/accessibility/VPATModule2_PreptoWrite.pdf), [W3C additions](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/).

### Target and method

- Local inspected HEAD: d301f8a87684733a246e9f609327f81d5412b239; dirty shared working tree and foreign staged Art Studio/catalog edits preserved. No whole-candidate freeze or deployment equivalence is established.
- Historical v1.6 metadata and September 12/19/26 reports retain their original environments/results. Live 6770c29ca and old 1300a2da3 are separate layers.
- C6770 is parent-supplied bounded cloud QA, not an Enigma test run. The original journal/screenshots are off checkout; browser, OS, AT versions and named tester details were not supplied for this review. No real screen-reader evidence is implied.
- LWS saved October 1 source/module hashes match for 13 inspected non-host/protected-record paths. Prior 54 readiness/UI, 58 transport/runtime and 10 isolated Chromium checks were not rerun. Five selected axe rules, 320 CSS px and doubled root font cannot establish AT/native zoom/export/global conformance.
- This review ran only serial read/hash/document checks. No new browser suite, broad tests, heavy build, extra workers, dependency installation or production interaction. The existing [manual plan](../docs/accessibility-manual-test-plan.md) is still open.

### Complete 24-card scope inventory

IDs come from TOOL_CATALOG_GROUPS.all in AlloFlowANTI.txt, with labels reconciled against guided_mode_config_source.jsx. The 22-entry dispatcher catalog is different and is not substituted for the 24-card scope. Runtime observations below are bounded; unmentioned variants are not passes. Older claims of nine untested output paths are not carried forward as a current coverage count.

| ID | Card / surfaces | Existing evidence and remaining scope |
|---|---|---|
| analysis | Analyze Source Material | Teacher preparation; review hierarchy/results and learner exclusion. Current runtime coverage not established. |
| glossary | Glossary & Language Selection | C6770 reader vocabulary traversal is positive; definition/image equivalence, translation, touch and standalone glossary AT remain open. |
| simplified | Original with Supports / adaptation | C6770 Original/BOTH 30-occurrence Tab/replace/Escape/column walk is positive. All modes, hover, read-aloud, reflow/zoom and exported reading remain open. |
| ui-tool-wordsounds | Word Sounds | LWS local 54/58/10 checks with matching hashes; current live learner audio/activities/AT and 69-clip latency not established. Unverified phoneme content remains teacher-reviewed. |
| outline | Visual Organizer | Historical organizer keyboard output is bounded. Diagram alternatives, reading order, non-drag pointer methods and current learner/export/AT paths remain open. |
| note-taking | Note-Taking Templates | Historical Cornell cues are content evidence. Current form relationships, answer concealment, retention, keyboard, AT and exports remain open. |
| anchor-chart | Anchor Charts | Generated science/content concerns are not WCAG determinations. Current image/diagram alternatives, editing and exports remain open. |
| memory-aid | Memory Aid Studio | Historical retrieval/confidence/self-check/transfer loop is positive pedagogy evidence. Current keyboard, audio alternatives, reveal/status and AT paths remain open. |
| applied-challenge | Applied Challenge Studio | Historical useful output is not an accessibility pass. Current workspace ownership, form labels, revisions, recovery and AT remain open. |
| image | Visual Support | Current generated image quality, meaningful alternatives, decorative treatment, image-text and export equivalence remain open. |
| faq | FAQ Generator | Historical source-grounded output is content evidence. Current disclosure keyboard/focus, hierarchy, read-aloud and AT remain open. |
| sentence-frames | Writing Scaffolds | Historical useful frames are content evidence. Current editable-label relationships, language, focus, retained input and exports remain open. |
| brainstorm | Activities / discussion / simulations | Historical useful discussion output is bounded. All discussion/jigsaw and embedded simulation variants, keyboard/canvas alternatives, timing and AT remain open. |
| persona | Interview Mode | Historical attributable-search failure; local actionable recovery does not prove live search. Current interview selection, focus, narration, source disclosure and transcript export remain open. |
| timeline | Sequence Builder | Historical keyboard reorder worked before stale-panel interruption. Current post-move focus, pointer non-drag alternative, feedback and AT remain open. |
| concept-sort | Concept Sort | C6770 student keyboard 3/4 → selective Fix → 4/4 completed. F21 five focus-to-BODY moves is a candidate for2.4.3/2.4.7 review, not automatic 2.1.1 failure. |
| dbq | Document-Based Question | C6770 student 34/34,111-word essay,self-rating and same-session reopen worked. LDBQ attribution safeguard is local; prompt quality and provenance require educator review, not automatic WCAG classification. |
| math | STEAM Lab / related Math flow | C6770 studentMath draft cancel/Tab loop/focus return worked; blank Self Grade 0/2 disabled submission and retained checkmarks need review. This does not test all STEAM tools. H26 dark contrast remains historical. |
| adventure | Adventure Mode | Current branch, choices, keyboard/focus, audio alternatives, time limits and storybook output remain unverified in the supplied current summaries. |
| quiz | Assess | Current question variants, grading/repair feedback, keyboard, time limits, AT and QTI/H5P delivery remain open; generic generated schemas do not establish coverage. |
| lesson-plan | Lesson Plan | LDBQ structural learner projection/teacher-print evidence is local; mixed narrative fields remain limited. Current teacher/student boundary, tables, sequencing and export AT remain open. |
| directions | Assignment Directions & Goals | Old teacher Directions contradicted authored sequence with a quest map; actual student exposure was not verified. Current navigation coherence, labels, help, focus and learner filtering remain open. |
| package-deliver | Preview, Package & Deliver | LWSmocktransport and learner-panel fixture checks are bounded. Actual destination/device delivery, full teacher-only filtering, reopen, authentication and every output format remain open. |
| alignment | Standards & UDL Alignment | Teacher/audit artifact; current labels, results structure, evidence claims and student-boundary behavior remain open. A generated alignment report is not independent content or accessibility validation. |

### Shared flows and known findings

| Flow / finding | Evidence state and exact review required |
|---|---|
| F21 Concept Sort move focus | Current live candidate: five moves dropped focus to BODY, next Tab restartedHide cards/Reset; keyboard completion succeeded. Evaluate logical focus sequence and visible indicator; not automatic keyboard nonconformance. [Focus order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html). |
| F22 Skip reading | Current live candidate: both controls left8 comparison/listen controls before passage. Evaluate repeated content and all bypass/landmark methods before deciding 2.4.1. [Bypass blocks](https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html). |
| Reader vocabulary and section reflection | Current bounded positives:30 vocabulary occurrences acrossOriginal/BOTH, popup replacement/Escape/column transition; per-section/cross-resource reflection isolation and same-session reopen. Explicit reload warning makes no durable-storage promise. Touch/hover/AT/zoom and other states remain open. |
| Source→generation→review→studentpreview→deliver | Inspect loading/cancel/retry/relevel/last-good/stale request/navigation; preserve optional adaptation and educator review. Schema parsing and fluent generation do not establish source accuracy or accessible output. Shared host/App integrations remain held. |
| Audio / Word Sounds preparation | Distinguish download, synthesis, play, partial clips, session cache and durable save. Timeout evidence is separate from quota/429. Local mock/native silent decode tests do not prove audible learner completion, connected transport or persistent reload. |
| Provider/error/status recovery | Review actually displayed statuses and AT exposure. A provider failure is not automatically 3.3.1; absent visual status is not automatically 4.1.3. [Input errors](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html), [status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html). Keep actionable active failures separate from recovered diagnostics. |
| Save/reopen and module loading | Old 1300 History 15 → 0, recovery 0 with stored categories and 143 tools loading are historical pilot blockers; permanent byte loss is not established. Test bridge ACK/write/read,rejected/delayed saves and reload on a frozen candidate before a durability claim. No real deletion/reset/import here. |
| Teacher/student boundaries | Check preview, live session, mailbox/QR/project and exported copies. LDBQ projection is structural and local; teacher prose inside retained fields remains limited. Analysis in old teacher Directions does not prove learner exposure. |
| Navigation / modal focus | Audit all 24 routes, generated/edited/reopened states, dialogs and nested dialogs, pending cancellation, overlays, sticky elements and on-screen keyboards. Positive Math/vocabulary cases do not cover every focus lifecycle. |
| Contrast / responsive states | H26 recorded119 dark-theme failures across10 STEM tools; retest current themes/states. Old UnsavedChanges3.79:1 at 11px bold is historical. Native resize/zoom,320 CSS px,orientation,text spacing and inner control/text clipping remain distinct checks. |
| Touch, gestures, dragging and targets | Inventory every action, including canvas/organizer/game editors; keyboard alternatives alone do not prove a single-pointer non-drag path. Measure current target size/spacing/exceptions. |
| Timing / motion / flashing / help / authentication | Inventory relevant limits, pause/stop/reduced-motion states, flash exposure, repeated help order, redundant entry and cognitive-test alternatives in supported identity flows. Current applicability of motion/live captions is pending. |

### Advertised output and delivery evidence

All rows are **pending manual/output evaluation** for a frozen current release. They are an inventory, not successful export tests.

| Format / route | Required retained evidence |
|---|---|
| PDF/Print, worksheets,Slides PPTX,Word DOCX,OpenDocument ODT | Actual generated bytes; reading order, headings/lists/tables, labels, image alternatives, language, contrast, keyboard/AT use. PDF structure checks and manual semantics are separate from web axe results. |
| Interactive HTML, EPUB, plain text, Markdown, NotebookLM source | Actual output/package behavior, navigation/language/semantics and equivalent meaning. A file opening or structural self-check does not establish full conformance. |
| Electronic Braille BRF; DAISY where offered | Identify braille grade/language and any unverified translation. Retain actual specialist review and supported reader/package validation; no automatic acceptance from an empty error list. |
| QTI, H5P, IMS packages | Imported destination-player behavior, keyboard/focus, feedback/alternatives and preserved source/learner projection; package schema success alone is insufficient. |
| Homework QR/self-contained link, Class Mailbox/hosted printable QR, live class session, editable project | Real sender/receiver, authentication, loading/retry, saved/reopened state, teacher boundaries and learner-device accessible operation. Mock transports are limited evidence. |
| Adventure Storybook HTML with optional narration; Persona JSON/HTML transcript | Actual visual/audio alternatives, controls, transcript equivalence, attribution, focus and privacy scope. |

### Evidence needed for a conformance determination

Use the existing manual plan with a frozen build/URL/package, scope, date, named evaluator, role, browser/OS/AT versions, technology dependencies and exclusions. Cover every applicable criterion across full pages and complete processes, including all 24 cards, shared teacher/student routes, supported standalone/embedded STEM/SEL variants and advertised outputs. Sampling must be representative and cannot justify a whole-product claim from successful subsets. [WCAG conformance](https://www.w3.org/TR/WCAG22/#conformance-reqs), [WCAG-EM 2.0](https://www.w3.org/TR/wcag-em-2/#relation-to-wcag-2-conformance-claims).

Schedule serial real NVDA with Chrome or Edge,VoiceOver with Safari and mobileAT checks when resources allow; native 200% text resize/zoom,400%/320 reflow,orientation,text spacing,theme/forced colors; meaningful non-text/media alternatives; pointer/keyboard/drag cancellation,targets, timing/flashing, audio controls,language/authentication; all dialogs/status/error/recovery/export/delivery states. Mark Pass,Fail,Blocked,Not tested or Not applicable with supporting records. Do not convert role-play, counts, silent axe rules or unshipped source changes into a criterion pass.

### Historical technical corrections

The [April snapshot](../alloflow_wcag_aa_audit_report.md) remains preserved. Its claim that bold text at 14 CSS px qualifies for 3:1 contrast is incorrect. Large text uses18pt (24 CSS px), or14pt bold (about 18.67 CSS px); ordinary 14px bold text still needs 4.5:1, subject to the criterion's actual exceptions. Label/role counts and the historical 78/100 score do not establish partial or full WCAG conformance. [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

The [September 26 report](../reports/wcag-audit-2026-09-26/README.md) is historical, including its 119 dark-theme nodes across10 STEM tools and its compiled app-shell skip-link rebuild still pending at that time. Its 220-tool/285-page samples are not combined with the newer 24-card live observations as one fresh evaluation.

The [document capability ledger](../docs/wcag_sc_coverage.md) was regenerated through its owned generator:55 active A/AA criteria; 11 Automated, 6 Structural, 3 Manual, 30 Conditional, 5 limited static-document N/A. The 32 active A/AA registry tools across 11 criteria exclude one AAA and one obsolete Parsing tool; the full registry still has 34 tagged tools across 13 tag values. AAA 3.1.4 is separate; removed 4.1.1 is a legacy capability, not a 2.2 criterion. Structural means construction support; Conditional is not N/A. This ledger covers document remediation, not whole-product accessibility.

The [isolated reader viewport/focus candidate](../reports/reader-accessibility-track18-followup-2026-09-26/HANDOFF.md) and [narration candidate](../reports/reader-narration-access-track18-2026-09-26/HANDOFF.md) remain supplemental evidence. Their synthetic keyboard viewport, fixture focus/reflow and mocked receipts do not establish actual mobile keyboards, screen-reader behavior, integration or durable save. No candidate patch was applied by this documentary review.

## Historical September 19 summary (retained)

- The [History contrast/reflow follow-up](../reports/wcag-audit-2026-09-19/history-contrast/README.md) fixes placeholder, secondary-label and dark Save contrast, plus mobile new-unit and resource-title clipping. Six theme-state axe samples and six mobile bounds/spacing samples pass; 17 targeted regression assertions pass. This uses a live component fixture; icons and complete workflows remain outside scope.
- Closed the Create-tab loading finding INV-01 in a [fresh local sidebar preview](../reports/wcag-audit-2026-09-19/sidebar-followup/README.md): stable labelled panels, complete tab-key behavior, visible translated names, History count contrast/status semantics, and menu target/focus checks. The catalog grid now prevents inner clipping at 320px and enlarged text spacing. Eight browser interaction/layout checks and five sidebar axe/reflow states pass; 34 distinct regression assertions pass across scoped runs. Gradient contrast and screen-reader checks remain open.
- Repaired keyboard access to Architecture Studio statistics, Circuit Builder schematic and Fire Ecology wide charts. Native scrolling passes for all three regions, including sequential focus, actual arrow-key movement and Tab exit; a separate focused run passes all three search states. Full-page timeout results are retained in the report.
- Fixed the sidebar tool-count badge contrast under enlarged text spacing; the ready workspace passes desktop and mobile probes. Eighteen sidebar accessibility/catalog assertions pass.
- Repaired Raptor Hunt search ARIA in empty, matching and no-match states; improved decorative quick-start number contrast. Twelve distinct overview focus-profile cases pass across the targeted retests.
- Corrected themed math fixtures to match the production host. Nine theme cases plus one light-state control pass; Number Line required no product change. The earlier Titration titrate failure also passes on current code.
- Earlier fixes remain covered by 38 passing assertions across six files and nine current initial-page browser states with no axe A/AA violations. Incomplete rules and unloaded catalog content remain explicit limitations.
- The prior 6,926-test run (6,826 passed, 97 failed, 3 pending) and 49 source-scan candidates are **September 12 historical evidence**, not fresh v1.6 results. Broad runs interrupted this week are not counted as passes.

The [September 12 audit](../reports/wcag-audit-2026-09-12/README.md), [triage](../reports/wcag-audit-2026-09-12/regression-triage.md), and [archived v1.5 VPAT](../docs/accessibility/archive/AlloFlow-ACR-v1.5-2026-09-12.md) remain available.

Full conformance is not established. Continue the [manual test plan](../docs/accessibility-manual-test-plan.md), including screen-reader, native browser zoom, complete live/authenticated workflows, media alternatives and generated-output checks. Other unresolved fixture/product diagnostics remain open; INV-01 is repaired in the current local source and preview.
