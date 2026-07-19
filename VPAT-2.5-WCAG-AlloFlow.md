# AlloFlow Accessibility Conformance Report

**WCAG Edition — based on VPAT® Version 2.5Rev**

> **Interim self-assessment.** This report is intentionally conservative. It documents current evidence for AlloFlow v1.2, but it does **not** claim full WCAG 2.1 or WCAG 2.2 conformance. Full-product keyboard, assistive-technology, zoom, text-spacing, generated-output, and representative-workflow verification remains in progress.

## Product and report information

| Field | Value |
|---|---|
| **Product name** | AlloFlow — Universal Design for Learning Platform |
| **Product version** | 1.2 |
| **Release date** | June 24, 2026 |
| **Report date** | July 18, 2026 |
| **Report status** | Interim vendor self-assessment; supersedes the May 17, 2026 v0.9.4 assessment |
| **Contact** | Aaron Pomeranz, PsyD — apomeranz@alloflow.org |
| **Product description** | A browser-based UDL platform with teacher and student workflows, accessibility and representation supports, STEM and SEL tools, content generation, assessment, and document-export features. Available data, hosting, identity, AI, and validation paths depend on deployment. |
| **Platform** | Web application and local desktop distribution |
| **Evaluation target** | Release metadata v1.2 and repository evidence based on commit `f6391e4a92ee`; the working tree contains later remediation, so the evidence is not yet tied to a clean, independently reproducible release tag. |
| **Evaluation methods** | axe-core 4.12 through the repository Puppeteer harness; custom rendered checks for landmarks, bypass navigation, focus visibility, labels, live regions, canvases, target size, and redundant entry; source review; focused regression tests; and rendered probes at 1280, 640, and 320 CSS pixels. |
| **Assistive technologies tested** | No complete release-level matrix yet. NVDA with Chrome/Edge and VoiceOver with Safari remain required. |
| **Browser coverage** | Automated rendered evidence uses the repository's Chromium-based harness. Cross-browser and browser/assistive-technology combinations remain pending; this report therefore makes no minimum-browser-version claim. |
| **Standards reported** | WCAG 2.2 Levels A and AA. The U.S. DOJ Title II regulatory baseline is WCAG 2.1 Level AA. |

## Scope and evidence boundaries

The [current WCAG 2.2 audit](a11y-audit/WCAG-2.2-current-audit.md) reports zero automated A/AA violations for the tested initial Desktop command-center and bundled-application states, plus successful 640 and 320 CSS-pixel reflow probes after remediation. Those are useful results, but they apply only to the rendered states and viewports listed in that audit.

This ACR covers the AlloFlow product as a whole. Because current evidence does not yet cover every tool, modal, generated artifact, third-party integration, browser, assistive technology, and end-to-end workflow, applicable criteria are reported as **Partially Supports** unless the criterion is not relevant to the product. A partial rating here often reflects incomplete product-wide verification rather than a confirmed defect. Known verified remediations and remaining manual work are documented in the current audit and the [manual accessibility test plan](docs/accessibility-manual-test-plan.md).

The archived [v0.9.4 assessment](docs/accessibility/archive/AlloFlow-ACR-v0.9.4-2026-05-17.md) is retained for traceability only. Its findings and conformance claim must not be applied to v1.2.

## Regulatory context

The U.S. Department of Justice Title II web and mobile application rule incorporates WCAG 2.1 Level A and AA success criteria and conformance requirements. In April 2026, DOJ extended the compliance dates to **April 26, 2027** for public entities with populations of 50,000 or more and **April 26, 2028** for smaller public entities and special district governments. AlloFlow's engineering target is WCAG 2.2 Level AA; that target does not by itself establish legal compliance.

- [Official DOJ/ADA.gov Title II guidance](https://www.ada.gov/resources/web-rule-first-steps/)
- [ITI VPAT® and ACR guidance](https://www.itic.org/policy/accessibility/vpat)

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
| **1.2.2 Captions (Prerecorded)** | Not Applicable | The product does not ship prerecorded synchronized video content. User- or third-party-provided media is outside this statement. |
| **1.2.3 Audio Description or Media Alternative (Prerecorded)** | Not Applicable | The product does not ship prerecorded synchronized video content. |
| **1.3.1 Info and Relationships** | Partially Supports | Recent remediation covers landmarks, headings, dialogs, tables, labels, lists, and grouped controls in many shared and high-use workflows. Full-product semantic and assistive-technology verification remains incomplete. |
| **1.3.2 Meaningful Sequence** | Partially Supports | Tested initial states and remediated dialogs preserve meaningful DOM order. Complex tools, generated documents, and all responsive states have not been manually reviewed. |
| **1.3.3 Sensory Characteristics** | Partially Supports | Many reviewed instructions and status patterns provide text in addition to visual cues. A product-wide content review remains pending. |
| **1.4.1 Use of Color** | Partially Supports | Shared review and game patterns have received text or programmatic status in addition to color. All tools, visualizations, and generated content have not been verified. |
| **1.4.2 Audio Control** | Partially Supports | Reviewed TTS, narration, and audio workflows provide controls. Product-wide timing and playback verification is incomplete. |
| **2.1.1 Keyboard** | Partially Supports | Extensive keyboard remediation and regression coverage exists, including native controls and alternatives to dragging. Complete keyboard-only walkthroughs of every major workflow remain required. |
| **2.1.2 No Keyboard Trap** | Partially Supports | Shared focus management and many modal lifecycles have been remediated. Exhaustive nested-dialog, editor, game, and third-party workflow testing is incomplete. |
| **2.1.4 Character Key Shortcuts** | Not Applicable | No product-wide single-character shortcut mechanism is intentionally provided. Text entry and native component behavior are not treated as application shortcuts. |
| **2.2.1 Timing Adjustable** | Partially Supports | Configurable AI timeouts and controls exist in reviewed timed workflows. All session, assessment, media, and third-party timing behavior has not been verified. |
| **2.2.2 Pause, Stop, Hide** | Partially Supports | Reviewed animations and auto-advancing experiences include controls or reduced-motion handling. Product-wide verification is incomplete. |
| **2.3.1 Three Flashes or Below Threshold** | Partially Supports | No known intentionally flashing content is present and broad reduced-motion remediation exists. A formal product-wide flash analysis has not been completed. |
| **2.4.1 Bypass Blocks** | Partially Supports | Tested application shells include skip navigation and landmark structure. Every standalone and embedded surface has not been verified. |
| **2.4.2 Page Titled** | Partially Supports | The main application provides contextual titles and headings. Standalone tools, auxiliary windows, and all route transitions require current verification. |
| **2.4.3 Focus Order** | Partially Supports | Many dialogs and complex workflows now implement initial focus, containment, and focus return. Complete keyboard walkthroughs are still required. |
| **2.4.4 Link Purpose (In Context)** | Partially Supports | Reviewed shared formatted-text links and controls have descriptive names. Generated content and all standalone tools remain to be sampled. |
| **2.5.1 Pointer Gestures** | Partially Supports | Reviewed functionality generally uses single-pointer actions and several complex gestures have alternatives. Product-wide touch and canvas verification is incomplete. |
| **2.5.2 Pointer Cancellation** | Partially Supports | Most reviewed activation uses native click behavior. Custom pointer, drag, drawing, and canvas interactions require complete verification. |
| **2.5.3 Label in Name** | Partially Supports | Numerous reviewed controls now derive accessible names from visible text. Product-wide and generated-control verification remains incomplete. |
| **2.5.4 Motion Actuation** | Not Applicable | No known functionality requires device-motion or user-motion actuation. |
| **3.1.1 Language of Page** | Partially Supports | Language metadata and multilingual helpers exist. Every standalone document, auxiliary window, and generated export has not been verified. |
| **3.2.1 On Focus** | Partially Supports | No known reviewed workflow changes context solely on focus. Complete keyboard and assistive-technology testing remains pending. |
| **3.2.2 On Input** | Partially Supports | Reviewed forms generally require explicit activation for major changes. All selection, setup, and generated-form workflows have not been verified. |
| **3.2.6 Consistent Help** | Partially Supports | Help mechanisms exist, but relative placement and availability across all applicable processes has not been verified. |
| **3.3.1 Error Identification** | Partially Supports | Shared toast, dialog, validation, and live-status patterns identify many errors. Every form, generated workflow, and third-party error path is not covered. |
| **3.3.2 Labels or Instructions** | Partially Supports | Rendered and source checks cover many control labels and instructions. Full-product review of form purpose and required formats remains incomplete. |
| **3.3.7 Redundant Entry** | Partially Supports | Saved state and autofill reduce repeated entry in several workflows. Multi-step processes and common-purpose autocomplete behavior require current manual verification. |
| **4.1.2 Name, Role, Value** | Partially Supports | Automated initial-state checks report no violations and extensive control/dialog remediation is documented. Dynamic, nested, generated, and third-party states remain incompletely tested. |

### Level A summary

| Criteria | Supports | Partially Supports | Does Not Support | Not Applicable |
|---:|---:|---:|---:|---:|
| **31** | 0 | **27** | 0 | **4** |

## WCAG 2.2 Level AA

| Criterion | Conformance | Remarks and explanations |
|---|---|---|
| **1.2.4 Captions (Live)** | Not Applicable | The product does not provide live synchronized audio/video programming. Third-party conferencing or media is outside this statement. |
| **1.2.5 Audio Description (Prerecorded)** | Not Applicable | The product does not ship prerecorded synchronized video content. |
| **1.3.4 Orientation** | Partially Supports | Tested shells reflow at multiple widths and no known orientation lock exists. Every standalone and complex tool has not been checked in portrait and landscape. |
| **1.3.5 Identify Input Purpose** | Partially Supports | Reviewed inputs use types, labels, and selected autocomplete tokens. Common-purpose fields across all forms require a current inventory. |
| **1.4.3 Contrast (Minimum)** | Partially Supports | Automated and targeted remediation covers tested states and many shared color patterns. All themes, generated content, tools, and interactive states have not received measured contrast verification. |
| **1.4.4 Resize Text** | Partially Supports | Tested shells pass 200%/400%-equivalent viewport probes. Browser-native zoom with representative complex tools remains required. |
| **1.4.5 Images of Text** | Partially Supports | Product UI generally uses real text. Generated images, user content, exports, and all embedded resources have not been verified. |
| **1.4.10 Reflow** | Partially Supports | Tested initial states showed no document overflow at 640 and 320 CSS pixels after remediation. Complex tools, dialogs, editors, and generated outputs remain to be sampled. |
| **1.4.11 Non-text Contrast** | Partially Supports | Focus indicators, controls, and state boundaries have received targeted remediation. Product-wide measurement across themes and states is incomplete. |
| **1.4.12 Text Spacing** | Partially Supports | Flexible layout and typography helpers are present. WCAG-prescribed spacing overrides across representative complex tools remain pending. |
| **1.4.13 Content on Hover or Focus** | Partially Supports | Shared tooltip and focus-within patterns are implemented in reviewed surfaces. Complete dismissal, persistence, and hoverability testing is incomplete. |
| **2.4.5 Multiple Ways** | Partially Supports | Major content is available through navigation, catalogs, and search/filter paths. Coverage of all product destinations and standalone tools is incomplete. |
| **2.4.6 Headings and Labels** | Partially Supports | Extensive heading and label remediation is documented. Product-wide hierarchy and generated-content review remains incomplete. |
| **2.4.7 Focus Visible** | Partially Supports | Global focus styling and targeted component remediation exist. Manual confirmation across every theme, control state, and complex tool remains required. |
| **2.4.11 Focus Not Obscured (Minimum)** | Partially Supports | Remediated dialogs and tested initial states provide usable focus. Representative keyboard walkthroughs with sticky regions, nested dialogs, and narrow viewports remain required. |
| **2.5.7 Dragging Movements** | Partially Supports | Many reviewed drag workflows now provide named move controls, keyboard movement, or select-and-place alternatives. Remaining drag-and-drop interactions require an inventory and verification. |
| **2.5.8 Target Size (Minimum)** | Partially Supports | Many reviewed controls were enlarged to at least 24 by 24 CSS pixels, often 44 by 44. All tools and allowable spacing exceptions have not been audited. |
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
| **24** | 0 | **22** | 0 | **2** |

## Overall assessment

| Criteria | Supports | Partially Supports | Does Not Support | Not Applicable |
|---:|---:|---:|---:|---:|
| **55** | 0 | **49** | 0 | **6** |

AlloFlow v1.2 has substantial accessibility engineering and positive automated results in the states tested. This interim ACR does **not** claim WCAG 2.1 Level AA or WCAG 2.2 Level AA conformance because the full-page, complete-process, browser, keyboard, assistive-technology, zoom, text-spacing, and generated-output verification matrix is incomplete.

## Work required before a full conformance claim

1. Complete keyboard-only walkthroughs of every major teacher and student workflow, including all modal and nested-modal focus lifecycles.
2. Test representative workflows with NVDA plus Chrome/Edge and VoiceOver plus Safari.
3. Confirm browser-native 200% and 400% zoom and WCAG text-spacing overrides in representative complex tools.
4. Inventory every drag operation and verify a single-pointer, non-drag alternative.
5. Audit generated images, documents, PDFs, companion windows, and exports—not only the authoring UI.
6. Run contrast and target-size measurements across every supported theme and responsive state.
7. Exercise each supported authentication and third-party integration path.
8. Tie final results to a clean release tag, exact browser and assistive-technology versions, test dates, and retained evidence artifacts.

## Revision history

| Date | Version | Change |
|---|---|---|
| July 18, 2026 | 1.2 interim | Replaced the outdated v0.9.4 conformance claim with a conservative WCAG 2.2 A/AA ACR based on current limited-scope evidence. Corrected report terminology, criterion counts, evidence boundaries, browser claims, and regulatory context. |
| May 17, 2026 | 0.9.4 archived | Original static and automated self-assessment; retained as a superseded historical record. |

---

VPAT® and the Voluntary Product Accessibility Template® are registered service marks of the Information Technology Industry Council (ITI). This completed report is an Accessibility Conformance Report based on the VPAT® 2.5Rev WCAG Edition. It is a vendor self-assessment, not a certification or legal opinion.
