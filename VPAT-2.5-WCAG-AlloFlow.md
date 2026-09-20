# AlloFlow Accessibility Conformance Report

**WCAG Edition — based on VPAT® Version 2.5Rev**

> **Interim self-assessment.** This report is intentionally conservative. It documents sampled evidence for AlloFlow v1.6 and historical v1.5 results, but it does **not** claim full WCAG 2.1 or WCAG 2.2 conformance. Full-product keyboard, assistive-technology, zoom, text-spacing, generated-output, and representative-workflow verification remains in progress.

## Product and report information

| Field | Value |
|---|---|
| **Product name** | AlloFlow — Universal Design for Learning Platform |
| **Product version** | 1.6 (web release metadata); local working tree |
| **Release date** | September 13, 2026 (`release.json`) |
| **Report date** | September 19, 2026 (America/New_York) |
| **Report status** | Interim vendor self-assessment; supersedes the September 12, 2026 v1.5 assessment |
| **Contact** | Aaron Pomeranz, PsyD — apomeranz@alloflow.org |
| **Product description** | A browser-based UDL platform with teacher and student workflows, accessibility and representation supports, STEM and SEL tools, content generation, assessment, and document-export features. Available data, hosting, identity, AI, and validation paths depend on deployment. |
| **Platform** | Browser application, local compiled web shell, and sampled companion pages. The native desktop wrapper was not reevaluated in this run. |
| **Evaluation target** | v1.6 release metadata; audit-start HEAD `749347d7b6df976c920c89723fefd37b7612c9ba` plus a mutable local working tree. Existing compiled web shell, current module fixtures, and the September 19 fresh sidebar development preview are separate evidence layers. No clean release rebuild or hosted-deployment equivalence is claimed. |
| **Evaluation methods** | September 19: axe-core 4.12.1 / Chromium 148.0.7778.96, selected rendered tool regressions, native keyboard-scroll checks, search-state semantics, initial-page desktop/320px/text-spacing probes, source review and mirror checks; a fresh development preview additionally tests delayed sidebar loading, tab/menu keyboard interaction and 320px reflow. September 12 historical evidence: 616-file heuristic scan and 808 selected regression files. See the dated reports for exact completed, interrupted and failed runs. |
| **Assistive technologies tested** | No complete release-level matrix yet. NVDA with Chrome/Edge and VoiceOver with Safari remain required. |
| **Browser coverage** | Windows 11 Home ARM64 (10.0.26200); Playwright Chromium 148.0.7778.96. Other browsers and assistive technologies were not run. Fixture tests use their own documented setup. |
| **Standards reported** | WCAG 2.2 Levels A and AA only. WCAG 2.0/2.1, Level AAA, Revised Section 508, and EN 301 549 are not separately reported. |

## Scope and evidence boundaries

The [September 19 follow-up](reports/wcag-audit-2026-09-19/README.md) records the current v1.6 sample and repairs. The [September 12 audit](reports/wcag-audit-2026-09-12/README.md) is historical v1.5 evidence; it was not globally rerun for v1.6. Its regression result was **6926 tests: 6826 passed, 97 failed, 3 pending**. A passed test is evidence for its assertions and fixture only, not an entire WCAG criterion or product workflow. The [regression triage](reports/wcag-audit-2026-09-12/regression-triage.md) separates runner/cascading errors from fixture and source-contract assertions; an isolated four-case retest passed Geometry World and reproduced three other assertions.

The September 12 rendered sample included the initial pathway chooser, AI Backend Settings, teacher Quick Start step 1, the community catalog shell, and standalone Video Studio's initial Record screen. Catalog entries were still loading; source/generator panels initially showed loading placeholders. A later 1280px check after onboarding found the source panel ready and no axe A/AA violations, with incomplete rules retained. Unready content in earlier probes is not counted as tested. No AI generation, camera/microphone capture, live session, account authentication, or exported artifact was exercised. Source-based and server-rendered component fixtures do not establish complete interactive-process coverage.

The five September 12 confirmed browser findings were corrected and verified in that local working tree: Video Studio and Quick Start contrast, catalog target size, Video Studio preflight semantics, and workspace label-in-name mismatches. The [remediation report](reports/wcag-audit-2026-09-12/remediation/README.md) records 38/38 targeted tests passing, nine initial-page axe/reflow states passing, and explicit workspace verification. The original full-suite totals above are baseline evidence and were not globally rerun. A missing Create-tab ARIA target was observed during loading and resolved after the source panel became ready. The September 12 scan’s 49 non-exempt static candidates require triage and are not 49 confirmed failures. The September 19 follow-up repaired keyboard access to three tool scroll regions and Raptor Hunt search semantics, improved the contrast of its quick-start numbers, and corrected the themed math test fixture. Number Line high-contrast and the previously failing Titration titrate sample now pass their selected browser checks. The fresh nine-state chooser/catalog/Video Studio probe has no axe A/AA violations, with incomplete checks retained. The [manual accessibility test plan](docs/accessibility-manual-test-plan.md) remains open.

This ACR describes product-wide assessment intent, with limited sampled evidence. Most criteria retain a qualified **Partially Supports** rating because evidence is incomplete; remarks explicitly identify known failures where established. This is a disclosed interim reporting convention, not a claim that missing evidence proves a defect. The [September v1.5 assessment](docs/accessibility/archive/AlloFlow-ACR-v1.5-2026-09-12.md), [July v1.2 assessment](docs/accessibility/archive/AlloFlow-ACR-v1.2-2026-07-18.md) and [May v0.9.4 assessment](docs/accessibility/archive/AlloFlow-ACR-v0.9.4-2026-05-17.md) are historical records.

## Standards and interpretation

The engineering target is [WCAG 2.2 Level AA](https://www.w3.org/TR/WCAG22/). This report follows the [ITI VPAT and ACR framework](https://www.itic.org/policy/accessibility/vpat); it does not establish legal compliance. Criterion 4.1.1 Parsing was removed in WCAG 2.2 and is not counted among the 55 A/AA criteria below. Level AAA is not evaluated or included.

## Conformance level terms

| Term | Definition used in this report |
|---|---|
| **Supports** | The functionality of the product has at least one method that meets the criterion without known defects or meets with equivalent facilitation. |
| **Partially Supports** | Some functionality of the product does not meet the criterion, or product-wide evidence is incomplete and the limitation is identified in the remarks. |
| **Does Not Support** | The majority of product functionality does not meet the criterion. |
| **Not Applicable** | The criterion is not relevant to the product. |

The added evidence qualifier in **Partially Supports** is disclosed because this interim report avoids using **Not Evaluated** for Level A or AA criteria.

## WCAG 2.2 Level A

| Criterion | Conformance | Remarks and explanations |
|---|---|---|
| **1.1.1 Non-text Content** | Partially Supports | Rendered and source checks cover accessible names, decorative imagery, canvases, and several generated-image paths. Product-wide review of every tool and generated output is incomplete. |
| **1.2.1 Audio-only and Video-only (Prerecorded)** | Partially Supports | TTS and recorded-speech workflows generally expose visible text or transcription. Every recording, export, and generated-media path has not been verified. |
| **1.2.2 Captions (Prerecorded)** | Partially Supports | Current Video Studio imports and plays prerecorded media and offers caption editing, VTT/SRT import, and caption export/burn-in. Caption completeness, accuracy, synchronization, and playback/export availability were not evaluated. The former product-wide Not Applicable exclusion is withdrawn. |
| **1.2.3 Audio Description or Media Alternative (Prerecorded)** | Partially Supports | Prerecorded video workflows exist. Availability and adequacy of descriptive alternatives for visual information, including tutorial and exported video, remain unverified; the former Not Applicable exclusion is withdrawn. |
| **1.3.1 Info and Relationships** | Partially Supports | Recent remediation covers landmarks, headings, dialogs, tables, labels, lists, and grouped controls in many shared and high-use workflows. Full-product semantic and assistive-technology verification remains incomplete. |
| **1.3.2 Meaningful Sequence** | Partially Supports | Tested initial states and remediated dialogs preserve meaningful DOM order. Complex tools, generated documents, and all responsive states have not been manually reviewed. |
| **1.3.3 Sensory Characteristics** | Partially Supports | Many reviewed instructions and status patterns provide text in addition to visual cues. A product-wide content review remains pending. |
| **1.4.1 Use of Color** | Partially Supports | Shared review and game patterns have received text or programmatic status in addition to color. All tools, visualizations, and generated content have not been verified. |
| **1.4.2 Audio Control** | Partially Supports | Reviewed TTS, narration, and audio workflows provide controls. Product-wide timing and playback verification is incomplete. |
| **2.1.1 Keyboard** | Partially Supports | The September 19 sidebar follow-up verifies manual tab activation, arrow wrapping, Home/End, focusable panels and History-menu keyboard opening/Escape focus return in a fresh local app preview. September 19: added named, keyboard-focusable scrolling regions to Architecture Studio statistics, Circuit Builder schematic, and Fire Ecology wide charts. Selected rendered profiles and native arrow-key scrolling checks are documented in the follow-up report. September 12 AI settings Enter/Tab/Escape/focus-return evidence remains historical. Complete keyboard-only workflows, including canvas, editors and games, remain unverified. |
| **2.1.2 No Keyboard Trap** | Partially Supports | AI settings accepted Tab navigation and Escape, returning focus to the launcher in the current browser sample. Nested dialogs, games, embedded editors, and complete workflows remain unverified. |
| **2.1.4 Character Key Shortcuts** | Partially Supports | Raptor Hunt implements single-character shortcuts (for example P, V, Z, T, and M), control presets, and custom bindings. Criteria for disabling/remapping to non-character keys or activation only on component focus require runtime verification. The former Not Applicable exclusion is withdrawn. |
| **2.2.1 Timing Adjustable** | Partially Supports | Timed games, assessments, sessions and transient notices require workflow-specific checks for disabling, adjusting or extending limits and applicable exceptions. AI/network request timeout settings alone are not evidence that user-facing time limits satisfy this criterion. |
| **2.2.2 Pause, Stop, Hide** | Partially Supports | Reviewed animations and auto-advancing experiences include controls or reduced-motion handling. Product-wide verification is incomplete. |
| **2.3.1 Three Flashes or Below Threshold** | Partially Supports | No known intentionally flashing content is present and broad reduced-motion remediation exists. A formal product-wide flash analysis has not been completed. |
| **2.4.1 Bypass Blocks** | Partially Supports | Tested application shells include skip navigation and landmark structure. Every standalone and embedded surface has not been verified. |
| **2.4.2 Page Titled** | Partially Supports | The main application provides contextual titles and headings. Standalone tools, auxiliary windows, and all route transitions require current verification. |
| **2.4.3 Focus Order** | Partially Supports | The current AI settings sample retains focus during 45 Tab steps and restores the invoking control on Escape. The live-quiz initial-focus assertion also fails in isolation (expected Alpha; actual Minimize), which needs workflow review rather than automatic classification as a WCAG failure. Representative complete teacher/student workflows and all nested layers remain to be tested. |
| **2.4.4 Link Purpose (In Context)** | Partially Supports | Reviewed shared formatted-text links and controls have descriptive names. Generated content and all standalone tools remain to be sampled. |
| **2.5.1 Pointer Gestures** | Partially Supports | Reviewed functionality generally uses single-pointer actions and several complex gestures have alternatives. Product-wide touch and canvas verification is incomplete. |
| **2.5.2 Pointer Cancellation** | Partially Supports | Most reviewed activation uses native click behavior. Custom pointer, drag, drawing, and canvas interactions require complete verification. |
| **2.5.3 Label in Name** | Partially Supports | The September 19 sidebar follow-up makes tab names derive from their visible localized labels and tests missing translations. AUD-05 corrected locally: More information and AI Guide & Assistant now derive accessible names from their visible content. The compact Start & setup control also uses its visible wording. The explicit axe label-content-name-mismatch check passes in the loaded desktop sample; speech input, other languages and all responsive states remain incompletely evaluated. See the remediation report. |
| **2.5.4 Motion Actuation** | Not Applicable | No known functionality requires device-motion or user-motion actuation. |
| **3.1.1 Language of Page** | Partially Supports | Language metadata and multilingual helpers exist. Every standalone document, auxiliary window, and generated export has not been verified. |
| **3.2.1 On Focus** | Partially Supports | No known reviewed workflow changes context solely on focus. Complete keyboard and assistive-technology testing remains pending. |
| **3.2.2 On Input** | Partially Supports | Reviewed forms generally require explicit activation for major changes. All selection, setup, and generated-form workflows have not been verified. |
| **3.2.6 Consistent Help** | Partially Supports | Help mechanisms exist, but relative placement and availability across all applicable processes has not been verified. |
| **3.3.1 Error Identification** | Partially Supports | Shared toast, dialog, validation, and live-status patterns identify many errors. Every form, generated workflow, and third-party error path is not covered. |
| **3.3.2 Labels or Instructions** | Partially Supports | Rendered and source checks cover many control labels and instructions. Full-product review of form purpose and required formats remains incomplete. |
| **3.3.7 Redundant Entry** | Partially Supports | Saved state and autofill reduce repeated entry in several workflows. Multi-step processes and common-purpose autocomplete behavior require current manual verification. |
| **4.1.2 Name, Role, Value** | Partially Supports | September 19: Raptor Hunt search now exposes aria-controls only when its results exist; the named results container has role=region. Empty, matching and no-match states are covered by targeted checks. The prior Video Studio region fix still passes the fresh initial-page axe sample; populated announcements need AT verification. The earlier September 19 sample reproduced INV-01. The [sidebar follow-up](reports/wcag-audit-2026-09-19/sidebar-followup/README.md) repairs it with persistent labelled panels and verifies relationships while module loading is deliberately delayed, during switching and after readiness. The workspace region and History status/menu semantics were also corrected; assistive-technology behavior remains unverified. Dynamic and third-party controls remain incompletely evaluated. |

### Level A summary

| Criteria | Supports | Partially Supports | Does Not Support | Not Applicable |
|---:|---:|---:|---:|---:|
| **31** | 0 | **30** | 0 | **1** |

## WCAG 2.2 Level AA

| Criterion | Conformance | Remarks and explanations |
|---|---|---|
| **1.2.4 Captions (Live)** | Not Applicable | No live synchronized audiovisual broadcast service is identified in the assessed first-party scope. Recording with live speech recognition is not a live broadcast. Third-party conferencing and deployed integrations require separate evaluation. |
| **1.2.5 Audio Description (Prerecorded)** | Partially Supports | Video Studio includes narration and visual-description workflows, but synchronized audio description of meaningful visual information in prerecorded content and exports was not evaluated. The former Not Applicable exclusion is withdrawn. |
| **1.3.4 Orientation** | Partially Supports | Tested shells reflow at multiple widths and no known orientation lock exists. Every standalone and complex tool has not been checked in portrait and landscape. |
| **1.3.5 Identify Input Purpose** | Partially Supports | Reviewed inputs use types, labels, and selected autocomplete tokens. Common-purpose fields across all forms require a current inventory. |
| **1.4.3 Contrast (Minimum)** | Partially Supports | The sidebar follow-up also corrects the History count badge (4.34:1 before; 13.35:1 measured after); the later [History contrast/reflow follow-up](reports/wcag-audit-2026-09-19/history-contrast/README.md) repairs light placeholders, Cancel/type badges and dark Save text, with supporting color measurements for three earlier gradient-text review items. Six theme-state axe samples have no violations; select-image and other incomplete checks remain. September 19: fixed the sidebar count badge at 320px with text spacing (previously 4.34:1), with a clean loaded-workspace retest; improved Raptor Hunt quick-start number contrast; the repaired overview passes its selected axe check. The earlier Titration titrate finding passes on current source. Number Line high-contrast passes after the fixture includes the real runtime theme and host; no Number Line product change was needed. The nine-state initial-page probe reports no contrast violations for chooser/catalog/Video Studio, with incomplete rules retained. September 12 measured ratios and Quick Start hover evidence are historical. Other themes, states and generated output remain incompletely evaluated. |
| **1.4.4 Resize Text** | Partially Supports | Narrow viewport measurements were performed at 320 CSS pixels. These are reflow probes, not browser-native text resizing or 200%/400% zoom tests; current resize-text verification remains pending. |
| **1.4.5 Images of Text** | Partially Supports | Product UI generally uses real text. Generated images, user content, exports, and all embedded resources have not been verified. |
| **1.4.10 Reflow** | Partially Supports | The later History follow-up repairs the new-unit form and cramped resource titles; populated component samples fit at 320px across light, dark and high-contrast themes. The September 19 sidebar follow-up repairs catalog controls clipped by an intrinsic grid column; measured control bounds fit at 320px before and after enlarged text spacing. Document overflow checks alone did not detect the original inner clipping. Sampled chooser, settings, Quick Start, catalog shell and Video Studio states had no document-level horizontal overflow at their measured widths. At 320px, chooser, Quick Start, catalog shell and Video Studio were also probed with text-spacing overrides. Internal clipping, loading content, complex tools and complete workflows require further review. |
| **1.4.11 Non-text Contrast** | Partially Supports | Focus indicators, controls, and state boundaries have received targeted remediation. Product-wide measurement across themes and states is incomplete. |
| **1.4.12 Text Spacing** | Partially Supports | The later History component sample verifies effective computed spacing after transitions and checks complete title visibility and control bounds at 320px across three themes. The September 19 sidebar follow-up verifies catalog control bounds after its grid repair at 320px with 1.5 line height, .12em letter spacing, .16em word spacing and 2em paragraph margins. Current 320px browser probes apply line height 1.5, paragraph spacing 2em, letter spacing 0.12em and word spacing 0.16em. Sampled pages retain document reflow. Existing browser fixture tests also exercise spacing, but neither document width alone nor automated passing assertions establish absence of all clipped text or lost functionality. |
| **1.4.13 Content on Hover or Focus** | Partially Supports | Shared tooltip and focus-within patterns are implemented in reviewed surfaces. Complete dismissal, persistence, and hoverability testing is incomplete. |
| **2.4.5 Multiple Ways** | Partially Supports | Major content is available through navigation, catalogs, and search/filter paths. Coverage of all product destinations and standalone tools is incomplete. |
| **2.4.6 Headings and Labels** | Partially Supports | Extensive heading and label remediation is documented. Product-wide hierarchy and generated-content review remains incomplete. |
| **2.4.7 Focus Visible** | Partially Supports | September 19: selected Architecture Studio, Circuit Builder, Fire Ecology and Raptor Hunt profiles check visible, unobscured focus in standard colors, emulated forced colors and short landscape. This is rendered-fixture evidence, not full tool interaction coverage. Earlier Geometry Sandbox overlay warnings, SEL practiceJourneys missing baselines and three skipped Coaster Lab profiles still require follow-up. Manual confirmation across themes and control states remains required. |
| **2.4.11 Focus Not Obscured (Minimum)** | Partially Supports | Remediated dialogs and tested initial states provide usable focus. Representative keyboard walkthroughs with sticky regions, nested dialogs, and narrow viewports remain required. |
| **2.5.7 Dragging Movements** | Partially Supports | Prior reviewed workflows include move buttons and select-and-place alternatives. Keyboard movement alone does not satisfy the single-pointer non-drag requirement. Every drag action, including canvas editing and third-party tools, still requires an equivalent single-pointer method to be verified. |
| **2.5.8 Target Size (Minimum)** | Partially Supports | AUD-03 corrected locally: catalog navigation links have minimum 24px height and wrapping gaps. GitHub measures 40.70 by 24 CSS pixels at 320px width, and 50.06 by 24 with text spacing; axe target-size passes. These measurements and other rendered regressions do not cover every pointer target. |
| **3.1.2 Language of Parts** | Partially Supports | BCP-47 helpers and targeted language tagging exist. All multilingual, AI-generated, and translated content has not been verified. |
| **3.2.3 Consistent Navigation** | Partially Supports | Shared shells provide consistent navigation in reviewed routes. Standalone tools, auxiliary windows, and all multi-step processes remain to be assessed. |
| **3.2.4 Consistent Identification** | Partially Supports | Shared control patterns and action names are used broadly. A product-wide terminology and component inventory has not been completed. |
| **3.3.3 Error Suggestion** | Partially Supports | Many reviewed validation and failure paths offer actionable guidance. All forms, generated workflows, and integration errors are not covered. |
| **3.3.4 Error Prevention (Legal, Financial, Data)** | Partially Supports | Confirmations and safeguards exist for reviewed destructive or consequential actions. Every data submission, deletion, export, and synchronization path requires current verification. |
| **3.3.8 Accessible Authentication (Minimum)** | Partially Supports | Authentication varies by deployment and may use platform or third-party identity flows. Each supported flow must be tested for cognitive-function-test alternatives. |
| **4.1.3 Status Messages** | Partially Supports | Shared live regions and targeted announcements cover many asynchronous and game states. Dynamic and third-party status behavior remains incompletely tested. |

### Level AA summary

| Criteria | Supports | Partially Supports | Does Not Support | Not Applicable |
|---:|---:|---:|---:|---:|
| **24** | 0 | **23** | 0 | **1** |

## Overall assessment

| Criteria | Supports | Partially Supports | Does Not Support | Not Applicable |
|---:|---:|---:|---:|---:|
| **55** | 0 | **53** | 0 | **2** |

The current v1.5 assessment records positive test evidence alongside confirmed exceptions and unresolved coverage. This interim ACR does **not** claim WCAG 2.2 Level AA conformance. Full-page, complete-process, assistive-technology, browser-native zoom, and generated-output verification remains incomplete. See the [September audit evidence](reports/wcag-audit-2026-09-12/README.md) for failed assertions, browser findings, and execution limitations.

## Work required before a full conformance claim

1. Resolve and retest the confirmed browser findings and triage the failed regression assertions and source candidates.
2. Complete keyboard-only walkthroughs of every major teacher and student workflow, including all modal and nested-modal focus lifecycles.
3. Test representative workflows with NVDA plus Chrome/Edge and VoiceOver plus Safari.
4. Confirm browser-native 200% and 400% zoom and WCAG text-spacing overrides in representative complex tools.
5. Inventory every drag operation and verify a single-pointer, non-drag alternative.
6. Audit generated images, documents, PDFs, companion windows, and exports—not only the authoring UI.
7. Run contrast and target-size measurements across every supported theme and responsive state.
8. Exercise each supported authentication and third-party integration path.
9. Tie final results to a clean release tag, exact browser and assistive-technology versions, test dates, and retained evidence artifacts.

## Revision history

| Date | Version | Change |
|---|---|---|
| September 12, 2026 | 1.5 interim | Refreshed release/snapshot scope and evidence; recorded confirmed runtime exceptions; withdrew unsupported media and shortcut exclusions; corrected zoom and dragging interpretation; retained incomplete-assessment boundaries. |
| July 18, 2026 | 1.2 interim | Replaced the outdated v0.9.4 conformance claim with a conservative WCAG 2.2 A/AA ACR based on current limited-scope evidence. Corrected report terminology, criterion counts, evidence boundaries, browser claims, and regulatory context. |
| May 17, 2026 | 0.9.4 archived | Original static and automated self-assessment; retained as a superseded historical record. |

---

VPAT® and the Voluntary Product Accessibility Template® are registered service marks of the Information Technology Industry Council (ITI). This completed report is an Accessibility Conformance Report based on the VPAT® 2.5Rev WCAG Edition. It is a vendor self-assessment, not a certification or legal opinion.
